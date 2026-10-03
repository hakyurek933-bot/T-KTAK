"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addCommentAction,
  deleteCommentAction,
  pinCommentAction,
  toggleCommentLikeAction,
} from "@/actions/comments";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { ReportButton } from "@/components/ReportButton";
import { timeAgo } from "@/lib/utils";
import { HeartIcon } from "@/components/icons";
import type { Role } from "@prisma/client";

export type CommentNode = {
  id: string;
  body: string;
  pinned?: boolean;
  createdAt: Date | string;
  author: { username: string; displayName: string; avatarUrl: string | null; role: Role };
  likes: { userId: string }[];
  replies?: CommentNode[];
};

/** Alttan açılan yorum paneli (TikTok tarzı) — yanıtlar ve beğeni destekli. */
export function CommentSheet({
  open,
  onClose,
  postId,
  comments,
  canComment,
  canModerate,
  canPin = false,
  currentUserId,
  onCommentAdded,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  comments: CommentNode[];
  canComment: boolean;
  canModerate: boolean;
  canPin?: boolean;
  currentUserId?: string;
  onCommentAdded?: () => void;
}) {
  const [state, action, pending] = useActionState(addCommentAction, null);
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onCommentAdded?.();
      setReplyTo(null);
    }
    wasPending.current = pending;
  }, [pending, state, onCommentAdded]);

  if (!open) return null;

  const total = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
  const isPinned = (c: CommentNode) =>
    pinnedId !== null ? c.id === pinnedId : !!c.pinned;
  const sorted = [...comments].sort(
    (a, b) => Number(isPinned(b)) - Number(isPinned(a))
  );

  async function handlePin(id: string) {
    try {
      const res = await pinCommentAction(id);
      if (!res.error) setPinnedId(res.pinned ? id : null);
    } catch {
      /* sessizce yoksay */
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="relative z-10 flex h-[72vh] w-full flex-col rounded-t-2xl border-t border-white/10 bg-panel shadow-2xl sm:mx-auto sm:max-w-lg">
        <div className="relative flex items-center justify-center border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold">{total} yorum</span>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <ul className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {comments.length === 0 && (
            <li className="py-10 text-center text-sm text-muted">
              Henüz yorum yok. İlk yorumu sen yap!
            </li>
          )}
          {sorted.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              canModerate={canModerate}
              canPin={canPin}
              pinned={isPinned(c)}
              onPin={() => handlePin(c.id)}
              onReply={() => setReplyTo(c)}
            />
          ))}
        </ul>

        {canComment ? (
          <form action={action} className="border-t border-white/10 p-3">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted">
                <span>
                  <strong className="text-white">@{replyTo.author.username}</strong> kişisine
                  yanıt veriyorsun
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="hover:text-white"
                >
                  İptal
                </button>
              </div>
            )}
            <input type="hidden" name="postId" value={postId} />
            {replyTo && <input type="hidden" name="parentId" value={replyTo.id} />}
            <div className="flex items-center gap-2">
              <input
                name="body"
                key={replyTo?.id ?? "root"}
                placeholder={replyTo ? "Yanıtını yaz..." : "Yorum ekle..."}
                maxLength={280}
                autoComplete="off"
                className="w-full rounded-full border border-white/10 bg-panel-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
              <button
                disabled={pending}
                className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "..." : "Gönder"}
              </button>
            </div>
          </form>
        ) : (
          <p className="border-t border-white/10 p-4 text-center text-xs text-muted">
            Yorum yapmak için giriş yapmalısın.
          </p>
        )}
        {state?.error && <p className="px-4 pb-2 text-xs text-red-400">{state.error}</p>}
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  currentUserId,
  canModerate,
  canPin,
  pinned,
  onPin,
  onReply,
}: {
  comment: CommentNode;
  currentUserId?: string;
  canModerate: boolean;
  canPin: boolean;
  pinned: boolean;
  onPin: () => void;
  onReply: () => void;
}) {
  const [liked, setLiked] = useState(
    !!currentUserId && comment.likes?.some((l) => l.userId === currentUserId)
  );
  const [count, setCount] = useState(comment.likes?.length ?? 0);
  const [showReplies, setShowReplies] = useState(false);
  const [, startTransition] = useTransition();

  function handleLike() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      try {
        const res = await toggleCommentLikeAction(comment.id);
        setLiked(res.liked);
        setCount(res.count);
      } catch {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  const replies = comment.replies ?? [];

  return (
    <li className="flex gap-3">
      <Avatar user={comment.author} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {pinned && (
            <span
              className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"
              title="Video sahibi bu yorumu sabitledi"
            >
              📌 Sabitli
            </span>
          )}
          <span className="text-sm font-semibold">@{comment.author.username}</span>
          <RoleTag role={comment.author.role} />
          <span className="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
          {canPin && (
            <button
              type="button"
              onClick={onPin}
              title={pinned ? "Sabiti kaldır" : "Yorumu sabitle"}
              className={`text-xs hover:text-amber-300 ${pinned ? "text-amber-300" : "text-muted"}`}
            >
              📌
            </button>
          )}
          {canModerate && (
            <form action={deleteCommentAction.bind(null, comment.id)} className="ml-auto">
              <button className="text-xs text-muted hover:text-red-400">Sil</button>
            </form>
          )}
        </div>
        <p className="mt-0.5 break-words text-sm text-foreground/90">{comment.body}</p>

        <div className="mt-1.5 flex items-center gap-4 text-xs text-muted">
          <button
            type="button"
            onClick={() => onReply()}
            className="font-medium hover:text-white"
          >
            Yanıtla
          </button>
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1 hover:text-white"
          >
            <HeartIcon size={14} filled={liked} />
            {count > 0 && count}
          </button>
          {currentUserId && (
            <ReportButton target="COMMENT" targetId={comment.id} />
          )}
        </div>

        {replies.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowReplies((s) => !s)}
              className="text-xs font-medium text-muted hover:text-white"
            >
              {showReplies
                ? "Yanıtları gizle"
                : `${replies.length} yanıtı gör`}
            </button>
            {showReplies && (
              <ul className="mt-3 space-y-3 border-l border-white/10 pl-3">
                {replies.map((r) => (
                  <li key={r.id} className="flex gap-2.5">
                    <Avatar user={r.author} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          @{r.author.username}
                        </span>
                        <RoleTag role={r.author.role} />
                        <span className="text-[10px] text-muted">
                          {timeAgo(r.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{r.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
