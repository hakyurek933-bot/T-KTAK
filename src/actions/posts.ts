"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { UPLOAD_REWARD } from "@/lib/coins";

export type PostState = { error?: string; ok?: boolean } | null;

const postSchema = z.object({
  videoUrl: z.string().url("Geçerli bir video bağlantısı gerekli").max(2000),
  caption: z.string().max(300, "Açıklama en fazla 300 karakter").optional(),
});

export async function createPostAction(
  _prev: PostState,
  formData: FormData
): Promise<PostState> {
  const user = await requireUser();

  const parsed = postSchema.safeParse({
    videoUrl: String(formData.get("videoUrl") || "").trim(),
    caption: String(formData.get("caption") || "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz veri" };
  }

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      videoUrl: parsed.data.videoUrl,
      caption: parsed.data.caption ?? null,
    },
  });

  await createLog({
    action: "POST_CREATE",
    actorId: user.id,
    detail: `@${user.username} video paylaştı (${post.id})`,
  });

  // Video ödülü: coin tablosu hazırsa ekle, hazır değilse sessizce geç.
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { coinBalance: { increment: UPLOAD_REWARD } },
    });
    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: UPLOAD_REWARD,
        reason: "UPLOAD_REWARD",
        note: `Video ödülü (${post.id})`,
      },
    });
  } catch {
    /* coin sistemi henüz kurulu değilse video yine de paylaşılır */
  }

  revalidatePath("/");
  revalidatePath(`/u/${user.username}`);
  redirect("/");
}

export async function deletePostAction(postId: string) {
  const user = await requireUser();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return;

  const canDelete =
    post.authorId === user.id || user.role === "FOUNDER" || user.role === "MOD";
  if (!canDelete) return;

  await prisma.post.delete({ where: { id: postId } });
  await createLog({
    action: "POST_DELETE",
    actorId: user.id,
    detail: `@${user.username} bir videoyu sildi (${postId})`,
  });

  revalidatePath("/");
  revalidatePath("/studio");
}
