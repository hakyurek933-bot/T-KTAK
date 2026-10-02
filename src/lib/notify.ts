import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

type NotifyInput = {
  userId: string; // bildirimi alacak kişi
  actorId: string; // işlemi yapan
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
};

/** Bildirim oluşturur. Kişinin kendine bildirim gitmez. Hata ana işlemi bozmaz. */
export async function notify(input: NotifyInput) {
  if (input.userId === input.actorId) return;
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        type: input.type,
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
      },
    });
  } catch (err) {
    console.error("Bildirim oluşturulamadı:", err);
  }
}
