import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { FollowButton } from "@/components/FollowButton";
import { SearchBar } from "@/components/SearchBar";
import { PlayIcon, HeartIcon } from "@/components/icons";
import { VideoThumb } from "@/components/VideoThumb";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ara — Taktik" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const me = await getCurrentUser();

  const users = q
    ? await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 20,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          _count: { select: { posts: true, followers: true } },
        },
      })
    : [];

  const posts = q
    ? await prisma.post.findMany({
        where: {
          OR: [
            { caption: { contains: q, mode: "insensitive" } },
            { author: { username: { contains: q, mode: "insensitive" } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          author: { select: { username: true, role: true } },
          likes: { select: { id: true } },
        },
      })
    : [];

  const myFollowing = me
    ? new Set(
        (
          await prisma.follow.findMany({
            where: { followerId: me.id },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      )
    : new Set<string>();

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5">
      <SearchBar defaultValue={q} />

      {!q && (
        <div className="mt-10 text-center text-muted">
          <p className="text-4xl">🔎</p>
          <p className="mt-3 font-semibold text-white">Ara</p>
          <p className="mt-1 text-sm">
            Kullanıcı adı, isim veya video açıklaması ile ara.
          </p>
        </div>
      )}

      {q && users.length === 0 && posts.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted">
          &quot;{q}&quot; için sonuç bulunamadı.
        </p>
      )}

      {users.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Kişiler
          </h2>
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/u/${u.username}`}>
                  <Avatar user={u} size={44} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${u.username}`} className="font-semibold hover:underline">
                      @{u.username}
                    </Link>
                    <RoleTag role={u.role} />
                  </div>
                  <p className="truncate text-xs text-muted">
                    {u._count.followers} takipçi · {u._count.posts} video
                  </p>
                </div>
                {me && me.id !== u.id && (
                  <FollowButton targetId={u.id} initialFollowing={myFollowing.has(u.id)} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Videolar
          </h2>
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/?v=${p.id}`}
                className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-panel-2"
              >
                <VideoThumb src={p.videoUrl} />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                  <PlayIcon size={12} />@{p.author.username}
                </div>
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                  <HeartIcon size={12} filled className="text-brand" />
                  {p.likes.length}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
