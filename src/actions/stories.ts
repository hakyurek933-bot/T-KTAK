"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, isStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";

export type StoryState = { error?: string } | null;

/** Hikaye tabloları prod DB'ye henüz işlenmemişse false döner. */
async function checkStoryTables() {
  try {
    await prisma.story.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

const createSchema = z.object({
  mediaUrl: z.string().url("Geçerli bir medya bağlantısı gerekli").max(2000),
  mediaType: z.enum(["video", "image"]),
  caption: z.string().trim().max(140, "Açıklama en fazla 140 karakter").optional(),
});

/** 24 saat geçerli hikaye paylaşır. */
export async function createStoryAction(
  _prev: StoryState,
  formData: FormData
): Promise<StoryState> {
  const user = await requireUser();

  if (!(await checkStoryTables())) {
    return { error: "Hikaye altyapısı henüz hazır değil, sonra tekrar dene" };
  }

  const limit = rateLimit(`story:${user.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Çok fazla hikaye paylaştın. Biraz bekle." };

  const parsed = createSchema.safeParse({
    mediaUrl: String(formData.get("mediaUrl") || "").trim(),
    mediaType: String(formData.get("mediaType") || "video"),
    caption: String(formData.get("caption") || "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz bilgi" };
  }

  const story = await prisma.story.create({
    data: {
      authorId: user.id,
      mediaUrl: parsed.data.mediaUrl,
      mediaType: parsed.data.mediaType,
      caption: parsed.data.caption ?? null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await createLog({
    action: "STORY_CREATE",
    actorId: user.id,
    detail: `@${user.username} hikaye paylaştı (${story.id})`,
  });

  revalidatePath("/");
  redirect(`/story/${user.username}`);
}

export async function deleteStoryAction(storyId: string) {
  const user = await requireUser();
  let story: { authorId: string } | null = null;
  try {
    story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
  } catch {
    return;
  }
  if (!story) return;
  if (story.authorId !== user.id && !isStaff(user.role)) return;

  await prisma.story.delete({ where: { id: storyId } });
  await createLog({
    action: "STORY_DELETE",
    actorId: user.id,
    detail: `@${user.username} bir hikayeyi sildi (${storyId})`,
  });

  revalidatePath("/");
}

/** Hikayeyi izlendi olarak işaretler (sessiz, tekrara dayanıklı). */
export async function markStorySeenAction(
  storyId: string
): Promise<{ ok?: boolean }> {
  const user = await requireUser();
  try {
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId: user.id } },
      update: {},
      create: { storyId, userId: user.id },
    });
  } catch {
    /* tablo yoksa veya hikaye silindiyse sessizce geç */
  }
  return { ok: true };
}
