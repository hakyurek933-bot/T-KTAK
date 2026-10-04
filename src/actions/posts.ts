"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { notifyMentions } from "@/lib/notify";
import { UPLOAD_REWARD } from "@/lib/coins";
import { containsProfanity, PROFANITY_ERROR } from "@/lib/badwords";

export type PostState = { error?: string; ok?: boolean } | null;

const postSchema = z.object({
  videoUrl: z.string().url("Geçerli bir video bağlantısı gerekli").max(2000),
  caption: z.string().max(300, "Açıklama en fazla 300 karakter").optional(),
  duetOfId: z.string().min(1).max(50).optional(),
  mediaType: z.enum(["video", "image"]).optional(),
  sound: z.string().trim().max(60, "Ses adı en fazla 60 karakter").optional(),
  soundUrl: z.string().url().max(2000).optional(),
});

export async function createPostAction(
  _prev: PostState,
  formData: FormData
): Promise<PostState> {
  const user = await requireUser();

  const parsed = postSchema.safeParse({
    videoUrl: String(formData.get("videoUrl") || "").trim(),
    caption: String(formData.get("caption") || "").trim() || undefined,
    duetOfId: String(formData.get("duetOfId") || "").trim() || undefined,
    mediaType: String(formData.get("mediaType") || "").trim() || undefined,
    sound: String(formData.get("sound") || "").trim() || undefined,
    soundUrl: String(formData.get("soundUrl") || "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz veri" };
  }

  // 🐺 Bozkurt Koruma: açıklama + ses adı filtresi.
  if (parsed.data.caption && containsProfanity(parsed.data.caption)) {
    return { error: PROFANITY_ERROR };
  }
  if (parsed.data.sound && containsProfanity(parsed.data.sound)) {
    return { error: PROFANITY_ERROR };
  }

  // Düet kuralı: orijinal video var olmalı, düetin düeti olmaz (zincir yok).
  if (parsed.data.duetOfId) {
    const original = await prisma.post.findUnique({
      where: { id: parsed.data.duetOfId },
      select: { id: true, duetOfId: true, mediaType: true },
    });
    if (!original) return { error: "Düet yapılacak video bulunamadı" };
    if (original.duetOfId) {
      return { error: "Düet videosuna düet yapılamaz" };
    }
    if (original.mediaType !== "video") {
      return { error: "Yalnızca videolara düet yapılır" };
    }
    if (parsed.data.mediaType === "image") {
      return { error: "Düet tepkisi video olmalı" };
    }
  }

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      videoUrl: parsed.data.videoUrl,
      caption: parsed.data.caption ?? null,
      duetOfId: parsed.data.duetOfId ?? null,
      mediaType: parsed.data.mediaType ?? "video",
      sound: parsed.data.sound ?? null,
      soundUrl: parsed.data.soundUrl ?? null,
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

  // Açıklamadaki @bahsetmeleri bildir.
  if (parsed.data.caption) {
    await notifyMentions({
      text: parsed.data.caption,
      actorId: user.id,
      postId: post.id,
    });
  }

  revalidatePath("/");
  revalidatePath(`/u/${user.username}`);
  redirect("/");
}

/** Video açıklamasını düzenler: yalnızca sahibi. Bozkurt filtresi uygulanır. */
export async function editCaptionAction(
  postId: string,
  caption: string
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  const text = caption.trim().slice(0, 300);
  if (containsProfanity(text)) return { error: PROFANITY_ERROR };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post || post.authorId !== user.id) {
    return { error: "Yalnızca kendi videonu düzenleyebilirsin" };
  }

  await prisma.post.update({
    where: { id: postId },
    data: { caption: text || null },
  });

  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePath("/discover");
  revalidatePath(`/u/${user.username}`);
  return { ok: true };
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
