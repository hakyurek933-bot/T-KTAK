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

/** Metindeki @kullanıcı bahsetmelerine bildirim gönderir (en fazla 5 kişi). */
export async function notifyMentions(input: {
  text: string;
  actorId: string;
  postId?: string | null;
  commentId?: string | null;
}) {
  try {
    const names = [
      ...new Set(
        (input.text.match(/@([\w.]{2,30})/g) ?? []).map((m) =>
          m.slice(1).toLowerCase()
        )
      ),
    ].slice(0, 5);
    if (names.length === 0) return;
    const users = await prisma.user.findMany({
      where: { username: { in: names } },
      select: { id: true },
    });
    for (const u of users) {
      if (u.id === input.actorId) continue;
      await notify({
        userId: u.id,
        actorId: input.actorId,
        type: "MENTION",
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
      });
    }
  } catch (err) {
    console.error("Bahsetme bildirimi oluşturulamadı:", err);
  }
}
