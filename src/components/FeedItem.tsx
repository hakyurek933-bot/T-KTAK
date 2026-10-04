"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { CommentSheet, type CommentNode } from "@/components/CommentSheet";
import { Caption } from "@/components/Caption";
import { ReportButton } from "@/components/ReportButton";
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  MusicIcon,
  EyeIcon,
  PlusIcon,
} from "@/components/icons";
import { toggleLikeAction } from "@/actions/likes";
import { toggleBookmarkAction } from "@/actions/bookmarks";
import { toggleFollowAction } from "@/actions/follow";
import { incrementViewAction } from "@/actions/views";
import { timeAgo, formatCount, isActivePromo } from "@/lib/utils";
import { deletePostAction } from "@/actions/posts";
import type { Role } from "@prisma/client";

export type FeedItemData = {
  id: string;
  videoUrl: string;
  caption: string | null;
  viewCount: number;
  promotedUntil?: Date | string | null;
  mediaType?: string | null;
  sound?: string | null;
  soundUrl?: string | null;
  duetOf?: { videoUrl: string; author: { username: string } } | null;
  createdAt: Date | string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: Role;
  };
  likes: { userId: string }[];
  bookmarks: { userId: string }[];
  comments: CommentNode[];
};

export function FeedItem({
  post,
  currentUserId,
  canModerate,
  isFollowingAuthor = false,
}: {
  post: FeedItemData;
  currentUserId?: string;
  canModerate: boolean;
  isFollowingAuthor?: boolean;
}) {
  const liked0 = currentUserId
    ? post.likes.some((l) => l.userId === currentUserId)
    : false;
  const saved0 = currentUserId
    ? post.bookmarks.some((b) => b.userId === currentUserId)
    : false;

  const [liked, setLiked] = useState(liked0);
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [saved, setSaved] = useState(saved0);
  const [following, setFollowing] = useState(isFollowingAuthor);
  const [pop, setPop] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments.length);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [hearts, setHearts] = useState<number[]>([]);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const soundRef = useRef<HTMLAudioElement>(null);
  const boosted = isActivePromo(post.promotedUntil);
  const isImage = post.mediaType === "image";

  function handleVisible() {
    incrementViewAction(post.id).catch(() => {});
  }

  function handleLike() {
    if (!currentUserId || isPending) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setPop(true);
    setTimeout(() => setPop(false), 320);
    if (next) {
      const id = Date.now() + Math.random();
      setHearts((h) => [...h.slice(-9), id]);
      setTimeout(() => {
        setHearts((h) => h.filter((x) => x !== id));
      }, 900);
    }
    startTransition(async () => {
      try {
        const res = await toggleLikeAction(post.id);
        setLiked(res.liked);
        setLikeCount(res.count);
      } catch {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  function handleBookmark() {
    if (!currentUserId) return;
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      try {
        const res = await toggleBookmarkAction(post.id);
        setSaved(res.saved);
      } catch {
        setSaved(!next);
      }
    });
  }

  function handleFollow() {
    if (!currentUserId) return;
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        const res = await toggleFollowAction(post.author.id);
        setFollowing(res.following);
      } catch {
        setFollowing(!next);
      }
    });
  }

  async function handleShare() {
    const url = `${window.location.origin}/?v=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: `@${post.author.username} - Taktik` });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* iptal edildi */
    }
  }

  return (
    <section className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      <div className="absolute inset-0">
        {post.duetOf ? (
          <div className="flex h-full w-full">
            <div className="relative h-full w-1/2 border-r border-white/20">
              <VideoPlayer src={post.duetOf.videoUrl} />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                @{post.duetOf.author.username}
              </span>
            </div>
            <div className="relative h-full w-1/2">
              <VideoPlayer
                src={post.videoUrl}
                onDoubleClick={handleLike}
                onFirstVisible={handleVisible}
              />
              <span className="absolute right-2 top-2 rounded-full bg-brand/80 px-2 py-0.5 text-[10px] font-bold text-white">
                🎭 Senin tepkin
              </span>
            </div>
          </div>
        ) : isImage ? (
          <ImageMedia src={post.videoUrl} onVisible={handleVisible} onLike={handleLike} />
        ) : (
          <VideoPlayer
            src={post.videoUrl}
            onDoubleClick={handleLike}
            onFirstVisible={handleVisible}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />

      {/* Beğeni kalp yağmuru */}
      {hearts.map((id, i) => (
        <span
          key={id}
          className="pointer-events-none absolute bottom-1/3 z-20 animate-float-heart text-3xl"
          style={{ right: `${8 + i * 3}%` }}
        >
          ❤️
        </span>
      ))}
      <style jsx>{`
        @keyframes float-heart {
          0% { opacity: 1; transform: translateY(0) scale(0.6); }
          100% { opacity: 0; transform: translateY(-110px) scale(1.4); }
        }
        .animate-float-heart { animation: float-heart 0.9s ease-out forwards; }
      `}</style>

      {/* Sağ aksiyon çubuğu */}
      <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
        {/* Yazar avatarı + takip butonu */}
        <div className="relative mb-1">
          <Link href={`/u/${post.author.username}`}>
            <Avatar user={post.author} size={48} />
          </Link>
          {currentUserId && currentUserId !== post.author.id && (
            <button
              type="button"
              onClick={handleFollow}
              aria-label={following ? "Takibi bırak" : "Takip et"}
              className={`absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-white transition ${
                following ? "bg-white/30" : "bg-brand"
              }`}
            >
              {following ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              ) : (
                <PlusIcon size={16} />
              )}
            </button>
          )}
        </div>

        <ActionButton
          onClick={handleLike}
          label={formatCount(likeCount)}
          className={pop ? "animate-pop" : ""}
        >
          <HeartIcon
            size={32}
            filled={liked}
            className={liked ? "text-[#fe2c55] drop-shadow-[0_0_8px_rgba(254,44,85,0.8)]" : "text-white"}
          />
        </ActionButton>

        <ActionButton onClick={() => setSheetOpen(true)} label={formatCount(commentCount)}>
          <CommentIcon size={32} className="text-white" />
        </ActionButton>

        <ActionButton
          onClick={handleBookmark}
          label={saved ? "Kaydedildi" : "Kaydet"}
        >
          <BookmarkIcon size={30} filled={saved} className="text-white" />
        </ActionButton>

        <ActionButton
          onClick={handleShare}
          label={copied ? "Kopyalandı" : "Paylaş"}
        >
          <ShareIcon size={30} className="text-white" />
        </ActionButton>

        <div className="flex flex-col items-center">
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noreferrer"
            download={`taktik-${post.id}.mp4`}
            title="Videoyu indir"
            className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-2xl ring-1 ring-white/20 backdrop-blur-md transition active:scale-90"
          >
            ⬇️
          </a>
          <span className="mt-1 text-xs font-semibold text-white drop-shadow">İndir</span>
        </div>

        {/* İzlenme */}
        <div className="flex flex-col items-center">
          <EyeIcon size={18} className="text-white/80" />
          <span className="mt-0.5 text-xs font-semibold text-white">
            {formatCount(post.viewCount)}
          </span>
        </div>

        <div className="mt-1 grid h-11 w-11 animate-[spin_6s_linear_infinite] place-items-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 ring-2 ring-black/40">
          <MusicIcon size={16} className="text-white" />
        </div>
      </div>

      {/* Alt bilgi */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-3 p-4 pb-6 pr-20">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/u/${post.author.username}`}
              className="truncate text-sm font-bold text-white drop-shadow hover:underline"
            >
              @{post.author.username}
            </Link>
            <RoleTag role={post.author.role} />
            {boosted && (
              <span
                className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-extrabold text-black"
                title="Coin ile öne çıkarılmış video"
              >
                ⚡ Öne çıkan
              </span>
            )}
            <span className="text-xs text-white/60">{timeAgo(post.createdAt)}</span>
          </div>

          {post.caption && (
            <Caption text={post.caption} className="mt-2 text-sm text-white/95" />
          )}

          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/80">
            {isImage ? (
              <>
                <span>📷</span>
                <span className="truncate">Fotoğraf — @{post.author.username}</span>
              </>
            ) : post.sound ? (
              <>
                <MusicIcon size={12} />
                {post.soundUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = soundRef.current;
                      if (!el) return;
                      if (soundPlaying) {
                        el.pause();
                        setSoundPlaying(false);
                      } else {
                        el.src = post.soundUrl as string;
                        el.play().catch(() => {});
                        setSoundPlaying(true);
                      }
                    }}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-[10px] hover:bg-white/25"
                    title="Sesi dinle"
                  >
                    {soundPlaying ? "⏸" : "▶"}
                  </button>
                )}
                <Link
                  href={`/sound/${encodeURIComponent(post.sound)}`}
                  className="truncate font-semibold text-white hover:underline"
                >
                  🎵 {post.sound}
                </Link>
                <audio
                  ref={soundRef}
                  onEnded={() => setSoundPlaying(false)}
                  onPause={() => setSoundPlaying(false)}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <MusicIcon size={12} />
                <span className="truncate">orijinal ses — @{post.author.username}</span>
              </>
            )}
          </p>

          {post.duetOf && (
            <p className="mt-2 text-xs font-semibold text-brand-2">
              🎭 <Link href={`/?v=${post.id}`} className="hover:underline">Düet</Link> • orijinal: @{post.duetOf.author.username}
            </p>
          )}

          {(canModerate || currentUserId === post.author.id) && (
            <form action={deletePostAction.bind(null, post.id)} className="mt-2">
              <button className="text-xs font-medium text-white/60 hover:text-red-400">
                Videoyu sil
              </button>
            </form>
          )}
          {currentUserId && (
            <div className="mt-2 flex items-center gap-3">
              {currentUserId !== post.author.id && !isImage && !post.duetOf && (
                <Link
                  href={`/upload?duet=${post.id}`}
                  className="text-xs font-semibold text-brand-2 hover:underline"
                >
                  🎭 Düet yap
                </Link>
              )}
              <ReportButton target="POST" targetId={post.id} />
            </div>
          )}
        </div>
      </div>

      <CommentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        postId={post.id}
        comments={post.comments}
        canComment={!!currentUserId}
        canModerate={canModerate}
        canPin={currentUserId === post.author.id}
        currentUserId={currentUserId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </section>
  );
}

/** Akıştaki fotoğraf gönderisi: görününce izlenme sayar, çift tık beğenir. */
function ImageMedia({
  src,
  onVisible,
  onLike,
}: {
  src: string;
  onVisible: () => void;
  onLike: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !seen.current) {
          seen.current = true;
          onVisible();
        }
      },
      { threshold: 0.6 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} onDoubleClick={onLike} className="grid h-full w-full place-items-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        className={`grid h-12 w-12 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md transition active:scale-90 ${className}`}
      >
        {children}
      </button>
      <span className="mt-1 text-xs font-semibold text-white drop-shadow">{label}</span>
    </div>
  );
}
