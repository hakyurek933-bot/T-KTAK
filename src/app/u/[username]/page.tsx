import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { FollowButton } from "@/components/FollowButton";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { ReportButton } from "@/components/ReportButton";
import { PlayIcon, HeartIcon, GridIcon, LockIcon } from "@/components/icons";
import { VideoThumb } from "@/components/VideoThumb";
import { DailyBonusButton } from "@/components/DailyBonusButton";
import { ProfileLevel } from "@/components/ProfileLevel";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  return { title: `@${username} — Taktik` };
}

export default async function ProfilePage({
  params,
  searchParams,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "likes" ? "likes" : "videos";
  const me = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      bio: true,
      banned: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!user) notFound();

  const isMe = me?.id === user.id;

  // Coin + aktivite bilgisi ayrı sorgular: kolonlar henüz yoksa profil yine açılır.
  let coinBalance = 0;
  let claimedToday = false;
  let likesReceived = 0;
  let liveCount = 0;
  let giftsSent = 0;
  try {
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coinBalance: true, lastDailyBonusAt: true },
    });
    coinBalance = account?.coinBalance ?? 0;
    claimedToday =
      isMe &&
      !!(
        account?.lastDailyBonusAt &&
        account.lastDailyBonusAt.toDateString() === new Date().toDateString()
      );
  } catch {
    /* coin sistemi hazır değilse 0 görünür */
  }
  try {
    [likesReceived, liveCount, giftsSent] = await Promise.all([
      prisma.like.count({ where: { post: { authorId: user.id } } }),
      prisma.liveRoom.count({ where: { authorId: user.id } }),
      prisma.liveGift.count({ where: { senderId: user.id } }),
    ]);
  } catch {
    /* canlı/coin tabloları hazır değilse rozetler kısmi görünür */
  }

  const [isFollowing, posts, likedPosts] = await Promise.all([
    me
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: me.id, followingId: user.id },
          },
        })
      : null,
    prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        author: { select: { username: true, role: true } },
        likes: { select: { id: true } },
      },
    }),
    prisma.like.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        post: {
          include: {
            author: { select: { username: true, role: true } },
            likes: { select: { id: true } },
          },
        },
      },
    }),
  ]);

  const grid =
    tab === "likes"
      ? likedPosts.map((l) => l.post)
      : posts;

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5">
      {/* Üst profil kartı */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Avatar user={user} size={96} />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">@{user.username}</h1>
          <RoleTag role={user.role} />
        </div>
        {user.bio && (
          <p className="max-w-md text-center text-sm text-muted">{user.bio}</p>
        )}
        {isMe && !user.avatarUrl && (
          <Link
            href="/settings"
            className="rounded-full bg-brand/15 px-4 py-1.5 text-xs font-semibold text-brand-2 ring-1 ring-brand/30 hover:bg-brand/25"
          >
            📷 Profil fotoğrafı ekle — seni daha çok kişi takip eder
          </Link>
        )}

        <div className="flex items-center gap-8 py-1 text-center">
          <Stat label="Takip" value={user._count.following} href={`/u/${user.username}/following`} />
          <Stat label="Takipçi" value={user._count.followers} href={`/u/${user.username}/followers`} />
          <Stat label="Beğeni" value={likedPosts.length} />
        </div>

        <ProfileLevel
          isStaff={isStaff(user.role)}
          posts={user._count.posts}
          followers={user._count.followers}
          likes={likesReceived}
          lives={liveCount}
          gifts={giftsSent}
          balance={coinBalance}
        />

        {isMe && (
          <DailyBonusButton claimedToday={claimedToday} balance={coinBalance} />
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {isMe ? (
            <>
              <Link
                href="/settings"
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold hover:border-white/40"
              >
                Profili düzenle
              </Link>
              <Link
                href="/saved"
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold hover:border-white/40"
              >
                🔖 Kaydedilenler
              </Link>
              <Link
                href="/studio"
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold hover:border-white/40"
              >
                🎬 Videolarım
              </Link>
              <ShareProfileButton username={user.username} />
              <Link
                href="/upload"
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white"
              >
                Video yükle
              </Link>
            </>
          ) : (
            me && (
              <>
                <FollowButton targetId={user.id} initialFollowing={!!isFollowing} size="lg" />
                <Link
                  href={`/messages/${user.username}`}
                  className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold hover:border-white/40"
                >
                  Mesaj
                </Link>
                <ShareProfileButton username={user.username} />
                <ReportButton target="USER" targetId={user.id} />
              </>
            )
          )}
        </div>

        {user.banned && isStaff(me?.role ?? "USER") && (
          <p className="mt-1 rounded-xl bg-red-500/10 px-4 py-2 text-xs text-red-400 ring-1 ring-red-500/30">
            Bu kullanıcı askıya alınmış.
          </p>
        )}
      </div>

      {/* Sekmeler */}
      <div className="mt-3 flex border-b border-white/10">
        <Link
          href={`/u/${user.username}`}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase ${
            tab === "videos" ? "border-b-2 border-white text-white" : "text-muted"
          }`}
        >
          <GridIcon size={16} /> Videolar
        </Link>
        <Link
          href={`/u/${user.username}?tab=likes`}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase ${
            tab === "likes" ? "border-b-2 border-white text-white" : "text-muted"
          }`}
        >
          <HeartIcon size={16} filled={tab === "likes"} /> Beğeniler
        </Link>
      </div>

      {/* İçerik */}
      {grid.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted">
          <LockIcon size={40} />
          <p className="text-sm font-medium">
            {tab === "likes" ? "Henüz beğeni yok" : "Henüz video yok"}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-1 sm:gap-2">
          {grid.map((p) => (
            <Link
              key={p.id}
              href={`/?v=${p.id}`}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-panel-2"
            >
              <VideoThumb src={p.videoUrl} />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                <PlayIcon size={12} />
                {formatCount(p.likes.length)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <span className="block text-base font-bold">{formatCount(value)}</span>
      <span className="text-xs text-muted">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="min-w-14 hover:opacity-80">
      {content}
    </Link>
  ) : (
    <div className="min-w-14">{content}</div>
  );
}
