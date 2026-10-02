"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function toggleLikeAction(postId: string) {
  const user = await requireUser();

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) throw new Error("Video bulunamadı");

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId: user.id, postId } });
    await notify({ userId: post.authorId, actorId: user.id, type: "LIKE", postId });
  }

  const count = await prisma.like.count({ where: { postId } });
  revalidatePath("/");
  return { liked: !existing, count };
}
