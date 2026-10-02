"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { CommentSheet, type CommentNode } from "@/components/CommentSheet";
import { Caption } from "@/components/Caption";
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
import { timeAgo, formatCount } from "@/lib/utils";
import { deletePostAction } from "@/actions/posts";
import type { Role } from "@prisma/client";

export type FeedItemData = {
  id: string;
  videoUrl: string;
  caption: string | null;
  viewCount: number;
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
        <VideoPlayer
          src={post.videoUrl}
          onDoubleClick={handleLike}
          onFirstVisible={handleVisible}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

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
          label={String(likeCount)}
          className={pop ? "animate-pop" : ""}
        >
          <HeartIcon size={32} filled={liked} className="text-white" />
        </ActionButton>

        <ActionButton onClick={() => setSheetOpen(true)} label={String(commentCount)}>
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
            <span className="text-xs text-white/60">{timeAgo(post.createdAt)}</span>
          </div>

          {post.caption && (
            <Caption text={post.caption} className="mt-2 text-sm text-white/95" />
          )}

          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/80">
            <MusicIcon size={12} />
            <span className="truncate">orijinal ses — @{post.author.username}</span>
          </p>

          {(canModerate || currentUserId === post.author.id) && (
            <form action={deletePostAction.bind(null, post.id)} className="mt-2">
              <button className="text-xs font-medium text-white/60 hover:text-red-400">
                Videoyu sil
              </button>
            </form>
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
        currentUserId={currentUserId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </section>
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
        className={`grid h-12 w-12 place-items-center rounded-full bg-black/30 backdrop-blur-sm ${className}`}
      >
        {children}
      </button>
      <span className="mt-1 text-xs font-semibold text-white">{label}</span>
    </div>
  );
}
