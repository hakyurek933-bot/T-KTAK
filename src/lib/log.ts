import "server-only";
import { prisma } from "@/lib/prisma";
import type { LogAction } from "@prisma/client";

type LogInput = {
  action: LogAction;
  actorId?: string | null;
  targetId?: string | null;
  detail?: string | null;
};

/** Denetim kaydı oluşturur. Log yazımı asla ana işlemi bozmasın. */
export async function createLog(input: LogInput) {
  try {
    await prisma.log.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        targetId: input.targetId ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (err) {
    console.error("Log kaydı oluşturulamadı:", err);
  }
}

export const LOG_ACTION_LABELS: Record<LogAction, string> = {
  SIGNUP: "Kayıt oldu",
  LOGIN: "Giriş yaptı",
  LOGOUT: "Çıkış yaptı",
  POST_CREATE: "Video paylaştı",
  POST_DELETE: "Video sildi",
  COMMENT_CREATE: "Yorum yaptı",
  COMMENT_DELETE: "Yorum sildi",
  EMAIL_VERIFY: "E-postayı doğruladı",
  LIVE_START: "Canlı yayın açtı",
  LIVE_END: "Canlı yayını bitirdi",
  MESSAGE_SEND: "Mesaj gönderdi",
  BAN: "Banladı",
  UNBAN: "Banı kaldırdı",
  ROLE_CHANGE: "Rol değiştirdi",
};
