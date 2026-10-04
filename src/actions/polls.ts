"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, isStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";
import { POLL_MINUTES } from "@/lib/live-meta";

export type PollView = {
  id: string;
  question: string;
  options: string[];
  endsAt: string;
  counts: number[];
  total: number;
  myVote: number | null;
} | null;

async function checkPollTables() {
  try {
    await prisma.livePoll.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

const startSchema = z.object({
  roomId: z.string().min(1),
  question: z.string().trim().min(2, "Soru en az 2 karakter").max(120),
  options: z
    .array(z.string().trim().min(1).max(30))
    .min(2, "En az 2 seçenek")
    .max(4, "En fazla 4 seçenek"),
});

/** Anket başlatır (yalnızca yayıncı). Oda başına tek aktif anket. */
export async function startPollAction(input: {
  roomId: string;
  question: string;
  options: string[];
}): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz anket" };
  }
  if (!(await checkPollTables())) {
    return { error: "Anket altyapısı henüz hazır değil" };
  }

  const room = await prisma.liveRoom.findUnique({
    where: { id: parsed.data.roomId },
    select: { authorId: true, status: true },
  });
  if (!room || room.status !== "LIVE") return { error: "Yayın sona ermiş" };
  if (room.authorId !== user.id) {
    return { error: "Yalnızca yayıncı anket başlatabilir" };
  }

  const active = await prisma.livePoll.findFirst({
    where: { roomId: parsed.data.roomId, endsAt: { gt: new Date() } },
    select: { id: true },
  });
  if (active) return { error: "Zaten aktif bir anket var" };

  await prisma.livePoll.create({
    data: {
      roomId: parsed.data.roomId,
      question: parsed.data.question,
      options: parsed.data.options,
      endsAt: new Date(Date.now() + POLL_MINUTES * 60 * 1000),
    },
  });

  await createLog({
    action: "POLL_START",
    actorId: user.id,
    detail: `@${user.username} anket başlattı: ${parsed.data.question}`,
  });

  revalidatePath(`/live/${parsed.data.roomId}`);
  return { ok: true };
}

/** Ankete oy verir (anket başına tek oy). */
export async function votePollAction(
  pollId: string,
  optionIdx: number
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  const limit = rateLimit(`pollvote:${user.id}`, 30, 60 * 1000);
  if (!limit.ok) return { error: "Çok hızlı oy veriyorsun" };
  if (!(await checkPollTables())) return { error: "Anket altyapısı henüz hazır değil" };

  const poll = await prisma.livePoll.findUnique({
    where: { id: pollId },
    select: { endsAt: true, options: true },
  });
  if (!poll || poll.endsAt.getTime() <= Date.now()) {
    return { error: "Anket sona ermiş" };
  }
  const count = Array.isArray(poll.options) ? poll.options.length : 0;
  if (optionIdx < 0 || optionIdx >= count) return { error: "Geçersiz seçenek" };

  try {
    await prisma.liveVote.create({
      data: { pollId, userId: user.id, optionIdx },
    });
  } catch {
    return { error: "Zaten oy kullandın" };
  }
  return { ok: true };
}

/** Odanın aktif anketi + sonuçlar + oyum. */
export async function getActivePoll(roomId: string, userId: string): Promise<PollView> {
  try {
    const poll = await prisma.livePoll.findFirst({
      where: { roomId, endsAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, question: true, options: true, endsAt: true },
    });
    if (!poll || !Array.isArray(poll.options)) return null;
    const options = poll.options.filter((o): o is string => typeof o === "string");
    if (options.length === 0) return null;

    const [groups, mine] = await Promise.all([
      prisma.liveVote.groupBy({
        by: ["optionIdx"],
        where: { pollId: poll.id },
        _count: true,
      }),
      prisma.liveVote.findUnique({
        where: { pollId_userId: { pollId: poll.id, userId } },
        select: { optionIdx: true },
      }),
    ]);
    const counts = options.map(
      (_, i) => groups.find((g) => g.optionIdx === i)?._count ?? 0
    );
    return {
      id: poll.id,
      question: poll.question,
      options,
      endsAt: poll.endsAt.toISOString(),
      counts,
      total: counts.reduce((s, c) => s + c, 0),
      myVote: mine?.optionIdx ?? null,
    };
  } catch {
    return null;
  }
}

/** Anketi erken bitirir (yayıncı veya ekip). */
export async function closePollAction(pollId: string) {
  const user = await requireUser();
  try {
    const poll = await prisma.livePoll.findUnique({
      where: { id: pollId },
      select: { roomId: true, room: { select: { authorId: true } } },
    });
    if (!poll) return;
    if (poll.room.authorId !== user.id && !isStaff(user.role)) return;
    await prisma.livePoll.update({
      where: { id: pollId },
      data: { endsAt: new Date() },
    });
    revalidatePath(`/live/${poll.roomId}`);
  } catch {
    /* sessizce geç */
  }
}
