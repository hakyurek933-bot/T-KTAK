import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { PlayIcon, HeartIcon } from "@/components/icons";
import { VideoThumb } from "@/components/VideoThumb";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keşfet — Taktik" };

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function DiscoverPage() {
  const [posts, creators, tags] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        author: { select: { username: true, role: true } },
        likes: { select: { id: true } },
        comments: { select: { id: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        _count: { select: { posts: true } },
      },
    }),
    Promise.all([
      prisma.post.count(),
      prisma.user.count(),
      prisma.like.count(),
    ]),
  ]);

  const [postCount, userCount, likeCount] = tags;

  // Öne çıkarılanlar üstte, sonra yeniler (JS sıralaması: şema geriliğinde güvenli).
  const ordered = [...posts].sort((a, b) => {
    const pa = a.promotedUntil && new Date(a.promotedUntil).getTime() > Date.now() ? 1 : 0;
    const pb = b.promotedUntil && new Date(b.promotedUntil).getTime() > Date.now() ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Son 7 günün trend etiketleri (açıklamalardan sayılır).
  let trends: { tag: string; count: number }[] = [];
  try {
    const recent = await prisma.post.findMany({
      where: {
        createdAt: { gt: weekAgo() },
        caption: { not: null },
      },
      take: 200,
      select: { caption: true },
    });
    const counts = new Map<string, number>();
    for (const p of recent) {
      const found = (p.caption ?? "").match(/#([\p{L}\p{N}_]+)/gu) ?? [];
      for (const t of found) {
        const key = t.slice(1).toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    trends = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  } catch {
    trends = [];
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-5">
      <h1 className="mb-4 text-xl font-extrabold">Keşfet</h1>

      {/* İstatistik şeridi */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Video", value: postCount },
          { label: "Kişi", value: userCount },
          { label: "Beğeni", value: likeCount },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-panel p-3 text-center"
          >
            <p className="text-xl font-extrabold text-brand-2">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Trend etiketler */}
      {trends.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            🔥 Trend etiketler
          </h2>
          <div className="flex flex-wrap gap-2">
            {trends.map((t) => (
              <Link
                key={t.tag}
                href={`/tag/${t.tag}`}
                className="rounded-full border border-white/10 bg-panel px-3 py-1.5 text-sm hover:border-brand"
              >
                <span className="font-semibold text-brand-2">#{t.tag}</span>{" "}
                <span className="text-xs text-muted">{t.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Öne çıkan içerik sahipleri */}
      {creators.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            İçerik üreticileri
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {creators.map((u) => (
              <Link
                key={u.id}
                href={`/u/${u.username}`}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5"
              >
                <span className="rounded-full p-0.5 ring-2 ring-brand">
                  <Avatar user={u} size={60} />
                </span>
                <span className="w-full truncate text-center text-xs font-medium">
                  @{u.username}
                </span>
                <span className="text-[10px] text-muted">{u._count.posts} video</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Video grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Videolar
        </h2>
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted">
            <p className="text-lg font-semibold text-white">Keşfedilecek video yok</p>
            <p className="mt-1 text-sm">İlk videoyu sen paylaş!</p>
            <Link
              href="/upload"
              className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
            >
              Video yükle
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {ordered.map((p) => (
              <Link
                key={p.id}
                href={`/?v=${p.id}`}
                className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-panel-2"
              >
                <VideoThumb src={p.videoUrl} />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                  <PlayIcon size={14} />
                  {p.comments.length}
                </div>
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                  <HeartIcon size={12} filled className="text-brand" />
                  {p.likes.length}
                </div>
                {p.author.role !== "USER" && (
                  <span className="absolute left-1.5 top-1.5">
                    <RoleTag role={p.author.role} />
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
