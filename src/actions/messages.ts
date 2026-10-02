"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";

const sendSchema = z.object({
  receiverId: z.string().min(1),
  body: z.string().trim().min(1, "Mesaj boş olamaz").max(1000, "Mesaj çok uzun"),
});

export async function sendMessageAction(input: {
  receiverId: string;
  body: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  const msgLimit = rateLimit(`message:${user.id}`, 60, 60 * 1000);
  if (!msgLimit.ok) {
    return { error: "Çok hızlı mesaj gönderiyorsun. Biraz yavaşla." };
  }

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz mesaj" };
  }

  if (parsed.data.receiverId === user.id) {
    return { error: "Kendine mesaj gönderemezsin" };
  }

  const receiver = await prisma.user.findUnique({
    where: { id: parsed.data.receiverId },
    select: { id: true, username: true, banned: true },
  });
  if (!receiver) return { error: "Kullanıcı bulunamadı" };
  if (receiver.banned) return { error: "Bu kullanıcı askıya alınmış" };

  await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId: receiver.id,
      body: parsed.data.body,
    },
  });

  await createLog({
    action: "MESSAGE_SEND",
    actorId: user.id,
    targetId: receiver.id,
    detail: `@${user.username} -> @${receiver.username}`,
  });

  revalidatePath("/messages");
  return { ok: true };
}

/** Sohbet geçmişini iki yönlü çeker ve karşıdan gelenleri okundu yapar. */
export async function markConversationRead(otherUserId: string) {
  const user = await requireUser();
  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/messages");
}
