"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, isStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { getAge, LIVE_MIN_AGE } from "@/lib/age";
import { LIVE_JOIN_TEXT } from "@/lib/utils";
import { containsProfanity, PROFANITY_ERROR } from "@/lib/badwords";
import { rateLimit } from "@/lib/ratelimit";

export type LiveState = { error?: string } | null;

/** İzleyici sayımı için nabız aralığı (saniye). Kısa tutulur ki hayalet sayılmasın. */
const VIEWER_TTL_SEC = 45;

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

  // Takipçilere canlı bildirimi (TikTok'taki gibi). Hata yayını engellemez.
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      take: 200,
      select: { followerId: true },
    });
    if (followers.length > 0) {
      await prisma.notification.createMany({
        data: followers.map((f) => ({
          userId: f.followerId,
          actorId: user.id,
          type: "LIVE" as const,
        })),
      });
    }
  } catch {
    /* bildirim gidemezse yayın yine de açılır */
  }

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

  // 🐺 Bozkurt Koruma: küfür filtresi.
  if (containsProfanity(parsed.data.body)) {
    return { error: PROFANITY_ERROR };
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

export type LiveGiftView = {
  id: string;
  gift: string;
  count: number;
  cost: number;
  createdAt: string;
  sender: { username: string };
};

export type LiveSnapshot = {
  status: string;
  viewers: number;
  likes: number;
  balance: number;
  messages: {
    id: string;
    body: string;
    createdAt: string;
    author: { username: string; role: string };
  }[];
  gifts: LiveGiftView[];
};

/** Canlı sohbet + izleyici sayısı anlık görüntüsü (istemci yoklaması için). */
export async function getLiveSnapshot(roomId: string): Promise<LiveSnapshot | null> {
  const user = await requireUser();

  let room: {
    status: string;
    likeCount: number;
    authorId: string;
    messages: {
      id: string;
      body: string;
      createdAt: Date;
      author: { username: string; role: "FOUNDER" | "MOD" | "USER" };
    }[];
    gifts: {
      id: string;
      gift: string;
      count: number;
      cost: number;
      createdAt: Date;
      sender: { username: string };
    }[];
  } | null = null;
  try {
    room = await prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: {
        status: true,
        likeCount: true,
        authorId: true,
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
        gifts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            gift: true,
            count: true,
            cost: true,
            createdAt: true,
            sender: { select: { username: true } },
          },
        },
      },
    });
  } catch {
    return null;
  }
  if (!room) return null;

  // Nabız: izleyici listesini taze tut. İlk girişte katılma mesajı bırak.
  // Yayın bitmişse kimseyi sayma; bayat satırları temizle ki sayı gerçek kalsın.
  try {
    await prisma.liveViewer
      .deleteMany({
        where: {
          roomId,
          lastSeen: { lt: new Date(Date.now() - VIEWER_TTL_SEC * 1000) },
        },
      })
      .catch(() => {});
    if (room.status === "LIVE") {
      const seen = await prisma.liveViewer.findUnique({
        where: { roomId_userId: { roomId, userId: user.id } },
        select: { id: true },
      });
      if (!seen) {
        // Yayıncı kendine katılma mesajı bırakmaz.
        if (user.id !== room.authorId) {
          await prisma.liveMessage
            .create({
              data: { roomId, authorId: user.id, body: LIVE_JOIN_TEXT },
            })
            .catch(() => {});
        }
      }
      await prisma.liveViewer.upsert({
        where: { roomId_userId: { roomId, userId: user.id } },
        update: { lastSeen: new Date() },
        create: { roomId, userId: user.id },
      });
    }
  } catch {
    /* sayaç kaçırılabilir, kritik değil */
  }

  let viewers = 0;
  let balance = 0;
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
  try {
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coinBalance: true },
    });
    balance = account?.coinBalance ?? 0;
  } catch {
    /* coin tablosu hazır değilse bakiye 0 görünür */
  }

  return {
    status: room.status,
    viewers,
    likes: room.likeCount,
    balance,
    messages: room.messages.reverse().map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: { username: m.author.username, role: m.author.role },
    })),
    gifts: room.gifts.reverse().map((g) => ({
      id: g.id,
      gift: g.gift,
      count: g.count,
      cost: g.cost,
      createdAt: g.createdAt.toISOString(),
      sender: { username: g.sender.username },
    })),
  };
}
