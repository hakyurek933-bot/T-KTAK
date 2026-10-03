"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";
import {
  DAILY_BONUS,
  findGift,
  isSameDay,
} from "@/lib/coins";

export type CoinState = { error?: string; ok?: boolean; balance?: number } | null;

/** Coin tabloları prod DB'ye henüz işlenmemişse false döner. */
async function checkCoinTables() {
  try {
    await prisma.coinTransaction.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

/** Günlük giriş bonusu: günde bir kez +50 coin. */
export async function claimDailyBonusAction(): Promise<CoinState> {
  const user = await requireUser();
  if (!(await checkCoinTables())) {
    return { error: "Coin sistemi henüz hazır değil, sonra tekrar dene" };
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coinBalance: true, lastDailyBonusAt: true },
  });
  if (!account) return { error: "Hesap bulunamadı" };

  if (
    account.lastDailyBonusAt &&
    isSameDay(account.lastDailyBonusAt, new Date())
  ) {
    return { error: "Bugünkü bonusunu zaten aldın. Yarın tekrar gel! 🎁" };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      coinBalance: { increment: DAILY_BONUS },
      lastDailyBonusAt: new Date(),
    },
    select: { coinBalance: true },
  });
  await prisma.coinTransaction.create({
    data: {
      userId: user.id,
      amount: DAILY_BONUS,
      reason: "DAILY_BONUS",
      note: "Günlük giriş bonusu",
    },
  });
  await createLog({
    action: "DAILY_BONUS",
    actorId: user.id,
    detail: `@${user.username} günlük bonus aldı (+${DAILY_BONUS})`,
  });

  revalidatePath(`/u/${user.username}`);
  return { ok: true, balance: updated.coinBalance };
}

const giftSchema = z.object({
  roomId: z.string().min(1),
  gift: z.string().min(1),
  count: z.coerce.number().int().min(1).max(50),
});

/** Canlı yayına hediye gönderir. Ücret gönderenden düşer, yayıncıya eklenir. */
export async function sendGiftAction(input: {
  roomId: string;
  gift: string;
  count: number;
}): Promise<CoinState> {
  const user = await requireUser();

  const limit = rateLimit(`gift:${user.id}`, 30, 60 * 1000);
  if (!limit.ok) return { error: "Çok hızlı hediye gönderiyorsun. Biraz yavaşla." };

  const parsed = giftSchema.safeParse(input);
  if (!parsed.success) return { error: "Geçersiz hediye" };
  const catalog = findGift(parsed.data.gift);
  if (!catalog) return { error: "Böyle bir hediye yok" };

  if (!(await checkCoinTables())) {
    return { error: "Coin sistemi henüz hazır değil, sonra tekrar dene" };
  }

  const cost = catalog.cost * parsed.data.count;

  let room: { status: string; authorId: string } | null = null;
  try {
    room = await prisma.liveRoom.findUnique({
      where: { id: parsed.data.roomId },
      select: { status: true, authorId: true },
    });
  } catch {
    return { error: "Canlı yayın altyapısı henüz hazır değil" };
  }
  if (!room || room.status !== "LIVE") {
    return { error: "Yayın sona ermiş" };
  }

  const sender = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coinBalance: true },
  });
  if (!sender || sender.coinBalance < cost) {
    return {
      error: `Yetersiz coin (gerekli: ${cost}). Günlük bonusla kazanabilirsin! 🪙`,
    };
  }

  const authorId = room.authorId;

  // Coin transferi: gönderen eksilir, yayıncı artar.
  await prisma.user.update({
    where: { id: user.id },
    data: { coinBalance: { decrement: cost } },
  });
  await prisma.coinTransaction.create({
    data: {
      userId: user.id,
      amount: -cost,
      reason: "GIFT_SENT",
      note: `${catalog.emoji} ${catalog.name} x${parsed.data.count}`,
    },
  });
  await prisma.user.update({
    where: { id: authorId },
    data: { coinBalance: { increment: cost } },
  });
  await prisma.coinTransaction.create({
    data: {
      userId: authorId,
      amount: cost,
      reason: "GIFT_EARNED",
      note: `@${user.username} hediye etti: ${catalog.emoji} ${catalog.name} x${parsed.data.count}`,
    },
  });
  await prisma.liveGift.create({
    data: {
      roomId: parsed.data.roomId,
      senderId: user.id,
      gift: catalog.key,
      count: parsed.data.count,
      cost,
    },
  });

  await createLog({
    action: "GIFT_SEND",
    actorId: user.id,
    detail: `@${user.username} hediye gönderdi: ${catalog.emoji} ${catalog.name} x${parsed.data.count} (-${cost})`,
  });

  const balance = await prisma.user
    .findUnique({ where: { id: user.id }, select: { coinBalance: true } })
    .then((u) => u?.coinBalance ?? 0)
    .catch(() => 0);

  revalidatePath(`/live/${parsed.data.roomId}`);
  return { ok: true, balance };
}

/** Canlı yayını beğen (kalp yağmuru). Cömerttir: dakikada 60 beğeni. */
export async function likeLiveAction(
  roomId: string
): Promise<{ error?: string; likes?: number }> {
  const user = await requireUser();

  const limit = rateLimit(`livelike:${user.id}`, 60, 60 * 1000);
  if (!limit.ok) return { error: "Çok hızlı beğeniyorsun" };

  try {
    const room = await prisma.liveRoom.update({
      where: { id: roomId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true, status: true },
    });
    if (room.status !== "LIVE") return { error: "Yayın sona ermiş" };
    return { likes: room.likeCount };
  } catch {
    return { error: "Beğeni kaydedilemedi" };
  }
}

const adjustSchema = z.object({
  username: z.string().trim().min(2).max(30),
  amount: z.coerce.number().int().min(-100000).max(100000),
});

/** Yönetici coin düzenler (ekler/çıkarır). İşlem deftere + loga işlenir. */
export async function adminAdjustCoinsAction(
  _prev: CoinState,
  formData: FormData
): Promise<CoinState> {
  const staff = await requireStaff();

  const parsed = adjustSchema.safeParse({
    username: String(formData.get("username") || "").toLowerCase(),
    amount: String(formData.get("amount") || ""),
  });
  if (!parsed.success) {
    return { error: "Geçersiz kullanıcı adı veya miktar" };
  }
  if (parsed.data.amount === 0) return { error: "Miktar sıfır olamaz" };

  if (!(await checkCoinTables())) {
    return { error: "Coin sistemi henüz hazır değil" };
  }

  const target = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true, username: true, coinBalance: true },
  });
  if (!target) return { error: "Kullanıcı bulunamadı" };
  if (parsed.data.amount < 0 && target.coinBalance < -parsed.data.amount) {
    return { error: `@${target.username} bakiyesi yetersiz (${target.coinBalance})` };
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { coinBalance: { increment: parsed.data.amount } },
    select: { coinBalance: true },
  });
  await prisma.coinTransaction.create({
    data: {
      userId: target.id,
      amount: parsed.data.amount,
      reason: "ADMIN_ADJUST",
      note: `@${staff.username} tarafından düzenlendi`,
    },
  });
  await createLog({
    action: "COIN_ADJUST",
    actorId: staff.id,
    targetId: target.id,
    detail: `@${staff.username} @${target.username} bakiyesini düzenledi (${parsed.data.amount > 0 ? "+" : ""}${parsed.data.amount})`,
  });

  revalidatePath("/admin");
  return { ok: true, balance: updated.coinBalance };
}
