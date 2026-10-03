import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { isSameDay } from "@/lib/coins";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { LiveLikeButton } from "@/components/LiveLikeButton";
import { LiveGiftBar } from "@/components/LiveGiftBar";
import { DailyBonusButton } from "@/components/DailyBonusButton";
import { Caption } from "@/components/Caption";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: `Canlı yayın — Taktik` };
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
    videoUrl: string;
    status: "LIVE" | "ENDED";
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

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4">
      <Link
        href="/live"
        className="mb-3 inline-block text-sm text-muted hover:text-white"
      >
        ← Tüm yayınlar
      </Link>

      <div className="mb-3 flex items-center gap-3">
        <Avatar user={room.author} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{room.title}</p>
          <p className="flex items-center gap-2 text-xs text-muted">
            @{room.author.username}
            <RoleTag role={room.author.role} />
            {room.status === "LIVE" ? (
              <span className="rounded-full bg-red-600 px-2 py-0.5 font-bold text-white">
                CANLI
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold">
                SONA ERDİ
              </span>
            )}
          </p>
        </div>
        {initial && room.status === "LIVE" && (
          <LiveLikeButton roomId={room.id} initialLikes={initial.likes} />
        )}
      </div>

      <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black sm:max-h-[60vh]">
        <VideoPlayer src={room.videoUrl} />
      </div>

      <div className="mt-3">
        <Caption text={room.title} className="text-sm text-white/90" />
      </div>

      {room.status === "LIVE" && (
        <div className="mt-3 flex flex-col gap-3">
          <DailyBonusButton claimedToday={claimedToday} balance={balance} />
          <LiveGiftBar roomId={room.id} balance={initial?.balance ?? balance} />
        </div>
      )}

      <div className="mt-3">
        {initial ? (
          <LiveChat
            roomId={room.id}
            isAuthor={room.author.id === me.id}
            canModerate={isStaff(me.role)}
            initial={initial}
          />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-panel p-4 text-center text-sm text-muted">
            Sohbet yüklenemedi.
          </p>
        )}
      </div>
    </div>
  );
}
