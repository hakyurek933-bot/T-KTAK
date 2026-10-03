import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { Feed } from "@/components/Feed";
import { FeedTabs } from "@/components/FeedTabs";
import { StoryStrip } from "@/components/StoryStrip";

export const dynamic = "force-dynamic";

// Yorumları tek seviye yanıtlarıyla birlikte getiren ortak include.
const commentInclude = {
  where: { parentId: null },
  orderBy: { createdAt: "desc" as const },
  take: 30,
  include: {
    author: {
      select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
    },
    likes: { select: { userId: true } },
    replies: {
      orderBy: { createdAt: "asc" as const },
      take: 30,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
        },
        likes: { select: { userId: true } },
      },
    },
  },
};

const postInclude = {
  author: {
    select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
  },
  likes: { select: { userId: true } },
  bookmarks: { select: { userId: true } },
  comments: commentInclude,
};

/** Sana Özel akışı her açılışta karıştırır (aynı videolar üst üste gelmez). */
function shuffleForYou<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const tab = sp.tab === "following" ? "following" : "foryou";

  const followingIds = user
    ? (
        await prisma.follow.findMany({
          where: { followerId: user.id },
          select: { followingId: true },
        })
      ).map((f) => f.followingId)
    : [];

  // Engelliler birbirinin akışında görünmez (tablo yoksa filtre yok).
  let hiddenAuthors: string[] = [];
  if (user) {
    try {
      const [iBlocked, blockedMe] = await Promise.all([
        prisma.block.findMany({
          where: { blockerId: user.id },
          select: { blockedId: true },
        }),
        prisma.block.findMany({
          where: { blockedId: user.id },
          select: { blockerId: true },
        }),
      ]);
      hiddenAuthors = [
        ...iBlocked.map((b) => b.blockedId),
        ...blockedMe.map((b) => b.blockerId),
      ];
    } catch {
      hiddenAuthors = [];
    }
  }

  const authorFilter =
    tab === "following"
      ? { in: followingIds, ...(hiddenAuthors.length ? { notIn: hiddenAuthors } : {}) }
      : hiddenAuthors.length
        ? { notIn: hiddenAuthors }
        : undefined;

  const posts = await prisma.post.findMany({
    where: authorFilter ? { authorId: authorFilter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: postInclude,
  });

  // Sana Özel karışık, Takip kronolojik.
  const feedPosts = tab === "following" ? posts : shuffleForYou(posts);

  const followedSet = new Set(followingIds);

  if (posts.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        {user && <FeedTabs active={tab} />}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-2 text-4xl font-black text-ink">
            T
          </div>
          <h2 className="mt-5 text-2xl font-bold">
            {tab === "following" ? "Takip ettiklerin henüz video paylaşmadı" : "Taktik'a hoş geldin"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {tab === "following"
              ? "Keşfet'ten kişileri takip et, videoları burada görünsün."
              : "Henüz video yok. İlk videoyu paylaşarak akışı başlat!"}
          </p>
          <div className="mt-6 flex gap-2">
            {tab === "following" ? (
              <Link
                href="/discover"
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white"
              >
                Keşfet
              </Link>
            ) : (
              <Link
                href="/upload"
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white"
              >
                Video yükle
              </Link>
            )}
            {!user && (
              <Link
                href="/signup"
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold"
              >
                Kayıt ol
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {user && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
          <div className="pointer-events-auto">
            <FeedTabs active={tab} />
          </div>
        </div>
      )}
      {user && <StoryStrip />}

      <Feed
        posts={feedPosts}
        currentUserId={user?.id}
        canModerate={!!user && isStaff(user.role)}
        followedIds={followedSet}
      />

      {!user && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/60 px-4 py-3 backdrop-blur md:bottom-6">
          <p className="text-sm text-white">
            Beğenmek, yorum yapmak ve mesajlaşmak için giriş yap.
          </p>
          <Link
            href="/login"
            className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white"
          >
            Giriş yap
          </Link>
        </div>
      )}
    </div>
  );
}
