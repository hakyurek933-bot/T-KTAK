"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";

async function checkBlockTables() {
  try {
    await prisma.block.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

/** Engelle / engeli kaldır (iki yönlü görünmezlik: akış + mesaj). */
export async function toggleBlockAction(
  targetId: string
): Promise<{ error?: string; blocked?: boolean }> {
  const user = await requireUser();

  if (targetId === user.id) return { error: "Kendini engelleyemezsin" };

  const limit = rateLimit(`block:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Çok fazla işlem. Biraz bekle." };

  if (!(await checkBlockTables())) {
    return { error: "Engelleme sistemi henüz hazır değil" };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true },
  });
  if (!target) return { error: "Kullanıcı bulunamadı" };

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    await createLog({
      action: "UNBLOCK",
      actorId: user.id,
      targetId,
      detail: `@${user.username} @${target.username} engelini kaldırdı`,
    });
    revalidatePath(`/u/${target.username}`);
    return { blocked: false };
  }

  await prisma.block.create({
    data: { blockerId: user.id, blockedId: targetId },
  });
  // Engelleyince takibi de bırak (tek yön).
  await prisma.follow
    .deleteMany({
      where: {
        OR: [
          { followerId: user.id, followingId: targetId },
          { followerId: targetId, followingId: user.id },
        ],
      },
    })
    .catch(() => {});
  await createLog({
    action: "BLOCK",
    actorId: user.id,
    targetId,
    detail: `@${user.username} @${target.username} engelledi`,
  });

  revalidatePath("/");
  revalidatePath(`/u/${target.username}`);
  return { blocked: true };
}

/** İki kullanıcı arasında engel var mı? (mesaj/akış filtresi için) */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  try {
    const count = await prisma.block.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return count > 0;
  } catch {
    return false;
  }
}
