"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function toggleFollowAction(targetId: string) {
  const user = await requireUser();
  if (user.id === targetId) return { following: false, followers: 0 };

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new Error("Kullanıcı bulunamadı");

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: { followerId: user.id, followingId: targetId },
    });
    await notify({ userId: targetId, actorId: user.id, type: "FOLLOW" });
  }

  const followers = await prisma.follow.count({ where: { followingId: targetId } });
  revalidatePath(`/u/${target.username}`);
  return { following: !existing, followers };
}
