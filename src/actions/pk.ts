"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { PK_MINUTES } from "@/lib/live-meta";

async function checkPkTables() {
  try {
    await prisma.pkChallenge.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export type PkState = {
  id: string;
  status: string;
  roomA: { id: string; title: string; author: { username: string } };
  roomB: { id: string; title: string; author: { username: string } };
  scoreA: number;
  scoreB: number;
  endsAt: string | null;
  winner: "A" | "B" | "DRAW" | null;
  mine: "A" | "B" | null;
} | null;

function score(likesGained: number, giftCoins: number) {
  return likesGained + giftCoins;
}

/** PK daveti gönderir (kendi canlı odandan hedef odaya). */
export async function challengePkAction(
  myRoomId: string,
  targetRoomId: string
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (myRoomId === targetRoomId) return { error: "Kendinle PK yapamazsın" };
  if (!(await checkPkTables())) return { error: "PK altyapısı henüz hazır değil" };

  const [mine, target] = await Promise.all([
    prisma.liveRoom.findUnique({
      where: { id: myRoomId },
      select: { authorId: true, status: true, title: true },
    }),
    prisma.liveRoom.findUnique({
      where: { id: targetRoomId },
      select: { authorId: true, status: true, title: true },
    }),
  ]);
  if (!mine || mine.authorId !== user.id || mine.status !== "LIVE") {
    return { error: "Önce kendi yayının açık olmalı" };
  }
  if (!target || target.status !== "LIVE") {
    return { error: "Hedef yayın sona ermiş" };
  }

  const existing = await prisma.pkChallenge
    .findFirst({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [
          { roomAId: myRoomId, roomBId: targetRoomId },
          { roomAId: targetRoomId, roomBId: myRoomId },
        ],
      },
      select: { id: true },
    })
    .catch(() => null);
  if (existing) return { error: "Bu odalar arasında zaten bir PK var" };

  await prisma.pkChallenge.create({
    data: { roomAId: myRoomId, roomBId: targetRoomId, status: "PENDING" },
  });

  await createLog({
    action: "PK_START",
    actorId: user.id,
    detail: `@${user.username} PK daveti gönderdi: ${mine.title} vs ${target.title}`,
  });

  revalidatePath(`/live/${myRoomId}`);
  revalidatePath(`/live/${targetRoomId}`);
  return { ok: true };
}

/** PK davetini yanıtlar (hedef oda sahibi). */
export async function respondPkAction(
  pkId: string,
  accept: boolean
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (!(await checkPkTables())) return { error: "PK altyapısı henüz hazır değil" };

  const pk = await prisma.pkChallenge.findUnique({
    where: { id: pkId },
    select: {
      id: true,
      status: true,
      roomAId: true,
      roomBId: true,
      roomA: { select: { likeCount: true, status: true } },
      roomB: { select: { likeCount: true, status: true, authorId: true } },
    },
  });
  if (!pk || pk.status !== "PENDING") return { error: "Davet bulunamadı" };
  if (pk.roomB.authorId !== user.id) return { error: "Bu davet sana değil" };
  if (pk.roomA.status !== "LIVE" || pk.roomB.status !== "LIVE") {
    await prisma.pkChallenge.update({
      where: { id: pkId },
      data: { status: "DECLINED" },
    });
    return { error: "Yayınlardan biri sona ermiş" };
  }

  if (!accept) {
    await prisma.pkChallenge.update({
      where: { id: pkId },
      data: { status: "DECLINED" },
    });
    revalidatePath(`/live/${pk.roomAId}`);
    revalidatePath(`/live/${pk.roomBId}`);
    return { ok: true };
  }

  const now = new Date();
  await prisma.pkChallenge.update({
    where: { id: pkId },
    data: {
      status: "ACCEPTED",
      baseLikesA: pk.roomA.likeCount,
      baseLikesB: pk.roomB.likeCount,
      startsAt: now,
      endsAt: new Date(now.getTime() + PK_MINUTES * 60 * 1000),
    },
  });

  await createLog({
    action: "PK_START",
    actorId: user.id,
    detail: `@${user.username} PK kabul etti (${PK_MINUTES} dk)`,
  });

  revalidatePath(`/live/${pk.roomAId}`);
  revalidatePath(`/live/${pk.roomBId}`);
  return { ok: true };
}

/** Odanın PK durumu + anlık skor (süre dolmuşsa otomatik kapatır). */
export async function getPkState(roomId: string): Promise<PkState> {
  const user = await requireUser();
  if (!(await checkPkTables())) return null;

  const pk = await prisma.pkChallenge.findFirst({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [{ roomAId: roomId }, { roomBId: roomId }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      roomAId: true,
      roomBId: true,
      baseLikesA: true,
      baseLikesB: true,
      startsAt: true,
      endsAt: true,
      roomA: {
        select: {
          title: true,
          likeCount: true,
          author: { select: { username: true } },
        },
      },
      roomB: {
        select: {
          title: true,
          likeCount: true,
          author: { select: { username: true } },
        },
      },
    },
  });
  if (!pk) return null;

  // Süre dolmuşsa kapat.
  if (
    pk.status === "ACCEPTED" &&
    pk.endsAt &&
    pk.endsAt.getTime() <= Date.now()
  ) {
    try {
      await prisma.pkChallenge.update({
        where: { id: pk.id },
        data: { status: "ENDED" },
      });
      await createLog({
        action: "PK_END",
        actorId: user.id,
        detail: `PK bitti: ${pk.roomA.title} vs ${pk.roomB.title}`,
      });
    } catch {
      /* sessizce geç */
    }
    return {
      id: pk.id,
      status: "ENDED",
      roomA: { id: pk.roomAId, title: pk.roomA.title, author: pk.roomA.author },
      roomB: { id: pk.roomBId, title: pk.roomB.title, author: pk.roomB.author },
      scoreA: 0,
      scoreB: 0,
      endsAt: pk.endsAt.toISOString(),
      winner: null,
      mine: pk.roomAId === roomId ? "A" : "B",
    };
  }

  if (pk.status === "PENDING") {
    return {
      id: pk.id,
      status: "PENDING",
      roomA: { id: pk.roomAId, title: pk.roomA.title, author: pk.roomA.author },
      roomB: { id: pk.roomBId, title: pk.roomB.title, author: pk.roomB.author },
      scoreA: 0,
      scoreB: 0,
      endsAt: null,
      winner: null,
      mine: pk.roomAId === roomId ? "A" : "B",
    };
  }

  // Aktif skor: kazanılan beğeni + pencere içi hediye coini.
  let giftA = 0;
  let giftB = 0;
  try {
    const [ga, gb] = await Promise.all([
      prisma.liveGift.aggregate({
        where: {
          roomId: pk.roomAId,
          createdAt: { gte: pk.startsAt ?? new Date(0) },
        },
        _sum: { cost: true },
      }),
      prisma.liveGift.aggregate({
        where: {
          roomId: pk.roomBId,
          createdAt: { gte: pk.startsAt ?? new Date(0) },
        },
        _sum: { cost: true },
      }),
    ]);
    giftA = ga._sum.cost ?? 0;
    giftB = gb._sum.cost ?? 0;
  } catch {
    /* hediye tablosu yoksa beğeniyle devam */
  }
  const scoreA = score(Math.max(0, pk.roomA.likeCount - pk.baseLikesA), giftA);
  const scoreB = score(Math.max(0, pk.roomB.likeCount - pk.baseLikesB), giftB);

  return {
    id: pk.id,
    status: "ACCEPTED",
    roomA: { id: pk.roomAId, title: pk.roomA.title, author: pk.roomA.author },
    roomB: { id: pk.roomBId, title: pk.roomB.title, author: pk.roomB.author },
    scoreA,
    scoreB,
    endsAt: pk.endsAt ? pk.endsAt.toISOString() : null,
    winner: null,
    mine: pk.roomAId === roomId ? "A" : "B",
  };
}
