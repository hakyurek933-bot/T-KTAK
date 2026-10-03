import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { StartLiveForm } from "@/components/StartLiveForm";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Canlı — Taktik" };

export default async function LivePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  let live: {
    id: string;
    title: string;
    startedAt: Date;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role: "FOUNDER" | "MOD" | "USER";
    };
    _count: { viewers: number };
  }[] = [];
  let ended: { id: string; title: string; author: { username: string } }[] = [];
  let myVideos: { id: string; videoUrl: string; caption: string | null }[] = [];
  let tablesReady = true;

  try {
    [live, ended, myVideos] = await Promise.all([
      prisma.liveRoom.findMany({
        where: { status: "LIVE" },
        orderBy: { startedAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
            },
          },
          _count: { select: { viewers: true } },
        },
      }),
      prisma.liveRoom.findMany({
        where: { status: "ENDED" },
        orderBy: { startedAt: "desc" },
        take: 12,
        select: { id: true, title: true, author: { select: { username: true } } },
      }),
      prisma.post.findMany({
        where: { authorId: me.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, videoUrl: true, caption: true },
      }),
    ]);
  } catch {
    tablesReady = false;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold">
        <span className="relative flex h-3 w-3">
          <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="h-3 w-3 rounded-full bg-red-500" />
        </span>
        Canlı Yayınlar
      </h1>

      {!tablesReady && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Canlı yayın altyapısı henüz hazır değil. Yakında aktif olacak.
        </p>
      )}

      {live.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-muted">
          <p className="font-semibold text-white">Şu an canlı yayın yok</p>
          <p className="mt-1 text-sm">İlk yayını sen aç!</p>
        </div>
      ) : (
        <ul className="mb-6 flex flex-col gap-3">
          {live.map((room) => (
            <li key={room.id}>
              <Link
                href={`/live/${room.id}`}
                className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-panel p-3 hover:bg-white/5"
              >
                <Avatar user={room.author} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{room.title}</p>
                  <p className="flex items-center gap-2 text-xs text-muted">
                    @{room.author.username}
                    <RoleTag role={room.author.role} />
                    <span>{timeAgo(room.startedAt)} başladı</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                  CANLI · {room._count.viewers}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <StartLiveForm videos={myVideos} />

      {ended.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Son yayınlar
          </h2>
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
            {ended.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/live/${room.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/5"
                >
                  <span className="truncate text-sm">
                    <span className="font-semibold">{room.title}</span>{" "}
                    <span className="text-muted">· @{room.author.username}</span>
                  </span>
                  <span className="text-xs text-muted">Tekrar izle →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
