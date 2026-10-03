"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, isStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { getAge, LIVE_MIN_AGE } from "@/lib/age";
import { rateLimit } from "@/lib/ratelimit";

export type LiveState = { error?: string } | null;

/** İzleyici sayımı için nabız aralığı (saniye). */
const VIEWER_TTL_SEC = 90;

const startSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter").max(80),
  videoUrl: z.string().url("Geçerli bir video bağlantısı gerekli").max(2000),
});

async function checkLiveTables() {
  try {
    await prisma.liveRoom.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function startLiveAction(
  _prev: LiveState,
  formData: FormData
): Promise<LiveState> {
  const user = await requireUser();

  if (!(await checkLiveTables())) {
    return { error: "Canlı yayın altyapısı henüz hazır değil, sonra tekrar dene" };
  }

  const parsed = startSchema.safeParse({
    title: String(formData.get("title") || ""),
    videoUrl: String(formData.get("videoUrl") || "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz bilgi" };
  }

  // Yaş sınırı: yayın açmak için 15 yaş ve üzeri + doğum tarihi şart.
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { birthdate: true },
  });
  const age = getAge(account?.birthdate);
  if (age === null) {
    return {
      error: "Yayın açmak için önce Ayarlar'dan doğum tarihini eklemelisin",
    };
  }
  if (age < LIVE_MIN_AGE) {
    return {
      error: `Canlı yayın açmak için ${LIVE_MIN_AGE} yaşından büyük olmalısın`,
    };
  }

  // Aynı anda tek aktif yayın.
  const active = await prisma.liveRoom.findFirst({
    where: { authorId: user.id, status: "LIVE" },
    select: { id: true },
  });
  if (active) redirect(`/live/${active.id}`);

  const room = await prisma.liveRoom.create({
    data: {
      authorId: user.id,
      title: parsed.data.title,
      videoUrl: parsed.data.videoUrl,
      status: "LIVE",
    },
  });

  await createLog({
    action: "LIVE_START",
    actorId: user.id,
    detail: `@${user.username} canlı yayın açtı: ${room.title}`,
  });

  revalidatePath("/live");
  redirect(`/live/${room.id}`);
}

export async function endLiveAction(roomId: string) {
  const user = await requireUser();
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { authorId: true, status: true, title: true },
  });
  if (!room || room.status !== "LIVE") return;

  const canEnd = room.authorId === user.id || isStaff(user.role);
  if (!canEnd) return;

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { status: "ENDED", endedAt: new Date() },
  });
  await prisma.liveViewer.deleteMany({ where: { roomId } });

  await createLog({
    action: "LIVE_END",
    actorId: user.id,
    detail: `@${user.username} canlı yayını bitirdi: ${room.title}`,
  });

  revalidatePath("/live");
  revalidatePath(`/live/${roomId}`);
}

const chatSchema = z.object({
  roomId: z.string().min(1),
  body: z.string().trim().min(1, "Mesaj boş olamaz").max(500, "Mesaj çok uzun"),
});

export async function sendLiveMessageAction(input: {
  roomId: string;
  body: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  const limit = rateLimit(`livemsg:${user.id}`, 40, 60 * 1000);
  if (!limit.ok) return { error: "Çok hızlı yazıyorsun. Biraz yavaşla." };

  const parsed = chatSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz mesaj" };
  }

  let room: { status: string } | null = null;
  try {
    room = await prisma.liveRoom.findUnique({
      where: { id: parsed.data.roomId },
      select: { status: true },
    });
  } catch {
    return { error: "Canlı yayın altyapısı henüz hazır değil" };
  }
  if (!room || room.status !== "LIVE") {
    return { error: "Yayın sona ermiş" };
  }

  await prisma.liveMessage.create({
    data: {
      roomId: parsed.data.roomId,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  return { ok: true };
}

export type LiveSnapshot = {
  status: string;
  viewers: number;
  messages: {
    id: string;
    body: string;
    createdAt: string;
    author: { username: string; role: string };
  }[];
};

/** Canlı sohbet + izleyici sayısı anlık görüntüsü (istemci yoklaması için). */
export async function getLiveSnapshot(roomId: string): Promise<LiveSnapshot | null> {
  const user = await requireUser();

  let room: {
    status: string;
    messages: {
      id: string;
      body: string;
      createdAt: Date;
      author: { username: string; role: "FOUNDER" | "MOD" | "USER" };
    }[];
  } | null = null;
  try {
    room = await prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: {
        status: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 60,
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { username: true, role: true } },
          },
        },
      },
    });
  } catch {
    return null;
  }
  if (!room) return null;

  // Nabız: izleyici listesini taze tut.
  try {
    await prisma.liveViewer.upsert({
      where: { roomId_userId: { roomId, userId: user.id } },
      update: { lastSeen: new Date() },
      create: { roomId, userId: user.id },
    });
  } catch {
    /* sayaç kaçırılabilir, kritik değil */
  }

  let viewers = 0;
  try {
    viewers = await prisma.liveViewer.count({
      where: {
        roomId,
        lastSeen: { gt: new Date(Date.now() - VIEWER_TTL_SEC * 1000) },
      },
    });
  } catch {
    /* sayaç kaçırılabilir */
  }

  return {
    status: room.status,
    viewers,
    messages: room.messages.reverse().map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: { username: m.author.username, role: m.author.role },
    })),
  };
}
