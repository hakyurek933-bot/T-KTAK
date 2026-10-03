import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { VideoThumb } from "@/components/VideoThumb";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Liderlik — Taktik" };

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function LeaderboardPage() {
  type TopVideo = {
    id: string;
    videoUrl: string;
    author: { username: string };
    likes: number;
  };
  type TopCaster = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    coins: number;
  };
  let topVideos: TopVideo[] = [];
  let topCasters: TopCaster[] = [];

  try {
    const vids = await prisma.post.findMany({
      where: { createdAt: { gt: weekAgo() } },
      take: 60,
      select: {
        id: true,
        videoUrl: true,
        author: { select: { username: true } },
        _count: { select: { likes: true } },
      },
    });
    topVideos = vids
      .map((v) => ({ ...v, likes: v._count.likes }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10)
      .map((v) => ({
        id: v.id,
        videoUrl: v.videoUrl,
        author: v.author,
        likes: v.likes,
      }));
  } catch {
    topVideos = [];
  }

  try {
    const groups = await prisma.coinTransaction.groupBy({
      by: ["userId"],
      where: { reason: "GIFT_EARNED", createdAt: { gt: weekAgo() } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });
    if (groups.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: groups.map((g) => g.userId) } },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });
      topCasters = groups.map((g) => {
        const u = users.find((x) => x.id === g.userId);
        return {
          id: g.userId,
          username: u?.username ?? "bilinmiyor",
          displayName: u?.displayName ?? "",
          avatarUrl: u?.avatarUrl ?? null,
          coins: g._sum.amount ?? 0,
        };
      });
    }
  } catch {
    topCasters = [];
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-5">
      <h1 className="mb-1 text-xl font-extrabold">🏆 Liderlik</h1>
      <p className="mb-6 text-sm text-muted">
        Son 7 günün yıldızları — her pazartesi sıfırlanır gibi tazelenir.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          🔥 Haftanın videoları
        </h2>
        {topVideos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted">
            Bu hafta henüz video yok.
          </p>
        ) : (
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topVideos.map((v, i) => (
              <li key={v.id}>
                <Link
                  href={`/?v=${v.id}`}
                  className="group relative block aspect-[9/16] overflow-hidden rounded-xl bg-panel-2"
                >
                  <VideoThumb src={v.videoUrl} />
                  <span
                    className={`absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${
                      i === 0
                        ? "bg-amber-400 text-black"
                        : i === 1
                          ? "bg-slate-300 text-black"
                          : i === 2
                            ? "bg-amber-700 text-white"
                            : "bg-black/60 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-bold text-white drop-shadow">
                    ❤️ {formatCount(v.likes)} · @{v.author.username}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          🎁 Haftanın yayıncıları
        </h2>
        {topCasters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted">
            Bu hafta henüz hediye kazanan yayıncı yok. Canlı aç, hediyeleri topla!
          </p>
        ) : (
          <ol className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
            {topCasters.map((u, i) => (
              <li key={u.id}>
                <Link
                  href={`/u/${u.username}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                      i === 0
                        ? "bg-amber-400 text-black"
                        : i === 1
                          ? "bg-slate-300 text-black"
                          : i === 2
                            ? "bg-amber-700 text-white"
                            : "bg-white/10 text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar
                    user={{
                      username: u.username,
                      displayName: u.displayName,
                      avatarUrl: u.avatarUrl,
                    }}
                    size={38}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      @{u.username}
                    </span>
                    <span className="text-xs text-muted">{u.displayName}</span>
                  </span>
                  <span className="text-sm font-bold text-amber-300">
                    🪙{formatCount(u.coins)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
