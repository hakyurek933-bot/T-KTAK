"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, isStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { notify, notifyMentions } from "@/lib/notify";
import { containsProfanity, PROFANITY_ERROR } from "@/lib/badwords";

const commentSchema = z.object({
  postId: z.string().min(1),
  parentId: z.string().optional(),
  body: z.string().trim().min(1, "Yorum boş olamaz").max(280, "Yorum çok uzun"),
});

export async function addCommentAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const user = await requireUser();

  const parsed = commentSchema.safeParse({
    postId: String(formData.get("postId") || ""),
    parentId: String(formData.get("parentId") || "") || undefined,
    body: String(formData.get("body") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz yorum" };
  }

  // 🐺 Bozkurt Koruma: küfür filtresi.
  if (containsProfanity(parsed.data.body)) {
    return { error: PROFANITY_ERROR };
  }

  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: { authorId: true },
  });
  if (!post) return { error: "Video bulunamadı" };

  const comment = await prisma.comment.create({
    data: {
      postId: parsed.data.postId,
      authorId: user.id,
      parentId: parsed.data.parentId ?? null,
      body: parsed.data.body,
    },
  });

  await createLog({
    action: "COMMENT_CREATE",
    actorId: user.id,
    detail: `@${user.username} yorum yaptı`,
  });

  // Yorum sahibine bildirim (yanıt ise yanıt bildirimi).
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: { authorId: true },
    });
    if (parent) {
      await notify({
        userId: parent.authorId,
        actorId: user.id,
        type: "REPLY",
        postId: parsed.data.postId,
        commentId: comment.id,
      });
    }
  } else {
    await notify({
      userId: post.authorId,
      actorId: user.id,
      type: "COMMENT",
      postId: parsed.data.postId,
      commentId: comment.id,
    });
  }

  // @bahsetmeleri bildir.
  await notifyMentions({
    text: parsed.data.body,
    actorId: user.id,
    postId: parsed.data.postId,
    commentId: comment.id,
  });

  revalidatePath("/");
  return null;
}

export async function toggleCommentLikeAction(commentId: string) {
  const user = await requireUser();

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: user.id, commentId } },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentLike.create({ data: { userId: user.id, commentId } });
  }

  const count = await prisma.commentLike.count({ where: { commentId } });
  return { liked: !existing, count };
}

/** Yorumu sabitle / sabiti kaldır: yalnızca video sahibi, gönderi başına tek sabit. */
export async function pinCommentAction(
  commentId: string
): Promise<{ error?: string; pinned?: boolean }> {
  const user = await requireUser();

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, parentId: true, pinned: true, post: { select: { authorId: true } } },
  });
  if (!comment || comment.parentId) return { error: "Yorum bulunamadı" };
  if (comment.post.authorId !== user.id) {
    return { error: "Yalnızca video sahibi sabitleyebilir" };
  }

  if (comment.pinned) {
    await prisma.comment.update({
      where: { id: commentId },
      data: { pinned: false },
    });
    revalidatePath("/");
    return { pinned: false };
  }

  await prisma.$transaction([
    prisma.comment.updateMany({
      where: { postId: comment.postId, pinned: true },
      data: { pinned: false },
    }),
    prisma.comment.update({ where: { id: commentId }, data: { pinned: true } }),
  ]);

  revalidatePath("/");
  return { pinned: true };
}

/** Yorum silme: yorum sahibi, video sahibi veya yönetici ekibi silebilir. */
export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { post: { select: { authorId: true } } },
  });
  if (!comment) return;

  const canDelete =
    comment.authorId === user.id ||
    comment.post.authorId === user.id ||
    isStaff(user.role);
  if (!canDelete) return;

  await prisma.comment.delete({ where: { id: commentId } });
  await createLog({
    action: "COMMENT_DELETE",
    actorId: user.id,
    detail: `@${user.username} bir yorumu sildi`,
  });
  revalidatePath("/");
}
