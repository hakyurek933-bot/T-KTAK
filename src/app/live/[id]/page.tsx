import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { isSameDay } from "@/lib/coins";
import { Avatar } from "@/components/Avatar";
import { LiveRoomView, type EndedSummary } from "@/components/LiveRoomView";
import { PkBanner } from "@/components/PkBanner";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: `Canlı yayın — Taktik` };
}

function recentCutoff() {
  return new Date(Date.now() - 45_000);
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  if (hh > 0) return `${hh} sa ${mm} dk`;
  if (mm > 0) return `${mm} dk`;
  return `${s} sn`;
}

export default async function LiveRoomPage({
  params,
}: PageProps<"/live/[id]">) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  let room: {
    id: string;
    title: string;
    videoUrl: string | null;
    status: "LIVE" | "ENDED";
    likeCount: number;
    category: string;
    startedAt: Date;
    endedAt: Date | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role: "FOUNDER" | "MOD" | "USER";
    };
  } | null = null;

  try {
    room = await prisma.liveRoom.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        status: true,
        likeCount: true,
        category: true,
        startedAt: true,
        endedAt: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  } catch {
    room = null;
  }
  if (!room) notFound();

  const { getLiveSnapshot } = await import("@/actions/live");
  const initial = await getLiveSnapshot(room.id);

  // Coin bakiyesi ayrı sorgu: kolon henüz yoksa sayfa yine açılır.
  let balance = 0;
  let claimedToday = false;
  try {
    const account = await prisma.user.findUnique({
      where: { id: me.id },
      select: { coinBalance: true, lastDailyBonusAt: true },
    });
    balance = account?.coinBalance ?? 0;
    claimedToday = !!(
      account?.lastDailyBonusAt && isSameDay(account.lastDailyBonusAt, new Date())
    );
  } catch {
    /* coin sistemi hazır değilse 0 görünür */
  }

  // Şu an izleyenler (son 45 saniyede nabız verenler).
  let watchers: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }[] = [];
  if (room.status === "LIVE") {
    try {
      const rows = await prisma.liveViewer.findMany({
        where: { roomId: room.id, lastSeen: { gt: recentCutoff() } },
        orderBy: { lastSeen: "desc" },
        take: 12,
        select: {
          user: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      });
      watchers = rows.map((r) => r.user);
    } catch {
      watchers = [];
    }
  }

  // Biten yayın özeti: süre + mesaj + beğeni + hediye.
  let endedSummary: EndedSummary | null = null;
  if (room.status === "ENDED") {
    try {
      const [msgCount, giftAgg] = await Promise.all([
        prisma.liveMessage.count({ where: { roomId: room.id } }),
        prisma.liveGift.aggregate({
          where: { roomId: room.id },
          _sum: { cost: true },
          _count: true,
        }),
      ]);
      const end = room.endedAt ?? new Date();
      endedSummary = {
        duration: formatDuration(end.getTime() - room.startedAt.getTime()),
        messages: msgCount,
        likes: initial?.likes ?? room.likeCount,
        giftCoins: giftAgg._sum.cost ?? 0,
        giftCount: giftAgg._count,
      };
    } catch {
      endedSummary = null;
    }
  }

  // PK daveti için diğer canlı odalar (yalnızca yayıncıya).
  let otherRooms: { id: string; title: string; author: { username: string } }[] = [];
  if (room.status === "LIVE" && room.author.id === me.id) {
    try {
      otherRooms = await prisma.liveRoom.findMany({
        where: { status: "LIVE", id: { not: room.id } },
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          author: { select: { username: true } },
        },
      });
    } catch {
      otherRooms = [];
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4">
      <Link
        href="/live"
        className="mb-3 inline-block text-sm text-muted hover:text-white"
      >
        ← Tüm yayınlar
      </Link>

      <LiveRoomView
        roomId={room.id}
        title={room.title}
        videoUrl={room.videoUrl}
        status={room.status}
        author={room.author}
        initial={initial}
        balance={balance}
        claimedToday={claimedToday}
        isAuthor={room.author.id === me.id}
        canModerate={isStaff(me.role)}
        currentUsername={me.username}
        startedAtISO={room.startedAt.toISOString()}
        endedSummary={endedSummary}
        category={room.category}
        otherRooms={otherRooms}
        livekitOn={!!process.env.LIVEKIT_URL}
      />

      {room.status === "LIVE" && (
        <div className="mt-3">
          <PkBanner
            roomId={room.id}
            canRespond={room.author.id === me.id || isStaff(me.role)}
          />
        </div>
      )}

      {room.status === "LIVE" && watchers.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-panel px-3 py-2">
          <div className="flex -space-x-2">
            {watchers.slice(0, 8).map((w) => (
              <span
                key={w.username}
                title={`@${w.username}`}
                className="rounded-full ring-2 ring-panel"
              >
                <Avatar
                  user={{
                    username: w.username,
                    displayName: w.displayName,
                    avatarUrl: w.avatarUrl,
                  }}
                  size={26}
                />
              </span>
            ))}
          </div>
          <p className="text-xs text-muted">
            <span className="font-semibold text-white">{watchers.length}</span>{" "}
            kişi izliyor
          </p>
        </div>
      )}
    </div>
  );
}
