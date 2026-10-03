"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteLiveMessageAction,
  endLiveAction,
  getLiveSnapshot,
  sendLiveMessageAction,
  type LiveGiftView,
  type LiveSnapshot,
} from "@/actions/live";
import { findGift } from "@/lib/coins";
import { EmojiPicker } from "@/components/EmojiPicker";
import { LIVE_JOIN_TEXT } from "@/lib/utils";
import { RoleTag } from "@/components/RoleTag";
import type { Role } from "@prisma/client";

type FeedItem =
  | { kind: "msg"; id: string; createdAt: string }
  | { kind: "gift"; id: string; createdAt: string };

export function LiveChat({
  roomId,
  isAuthor,
  canModerate,
  currentUsername,
  canDelete,
  initial,
  compact = false,
}: {
  roomId: string;
  isAuthor: boolean;
  canModerate: boolean;
  currentUsername: string;
  canDelete: boolean;
  initial: LiveSnapshot;
  compact?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 3 saniyede bir anlık görüntü (mesajlar + hediyeler + izleyici + durum).
  useEffect(() => {
    if (snapshot.status !== "LIVE") return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const next = await getLiveSnapshot(roomId);
        if (active && next) setSnapshot(next);
      } catch {
        /* sessizce yoksay */
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId, snapshot.status]);

  const feedLen = snapshot.messages.length + snapshot.gifts.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedLen]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setError(null);
    setSending(true);
    setText("");
    const res = await sendLiveMessageAction({ roomId, body });
    if (res.error) setError(res.error);
    setSending(false);
  }

  async function handleEnd() {
    if (!confirm("Yayını bitirmek istediğine emin misin?")) return;
    setEnding(true);
    try {
      await endLiveAction(roomId);
      const next = await getLiveSnapshot(roomId);
      if (next) setSnapshot(next);
    } finally {
      setEnding(false);
    }
  }

  async function handleDeleteMessage(id: string) {
    const res = await deleteLiveMessageAction(id);
    if (!res.error) {
      setSnapshot((s) => ({
        ...s,
        messages: s.messages.filter((m) => m.id !== id),
      }));
    }
  }

  const live = snapshot.status === "LIVE";
  const giftById = new Map(snapshot.gifts.map((g) => [g.id, g]));

  const feed: FeedItem[] = [
    ...snapshot.messages.map((m) => ({
      kind: "msg" as const,
      id: m.id,
      createdAt: m.createdAt,
    })),
    ...snapshot.gifts.map((g) => ({
      kind: "gift" as const,
      id: g.id,
      createdAt: g.createdAt,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const shown = feed.slice(-80);

  function renderGift(g: LiveGiftView) {
    const catalog = findGift(g.gift);
    return (
      <div
        key={`gift-${g.id}`}
        className="animate-gift-pop rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 to-pink-500/15 px-3 py-2 text-sm"
      >
        <span className="text-lg">{catalog?.emoji ?? "🎁"}</span>{" "}
        <span className="font-semibold">@{g.sender.username}</span>{" "}
        <span className="font-bold text-amber-300">
          {catalog?.name ?? "Hediye"} x{g.count}
        </span>{" "}
        <span className="text-xs text-muted">({g.cost}🪙)</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden bg-panel ${
        compact ? "h-full border-0 bg-transparent" : "h-[60vh] rounded-2xl border border-white/10 md:h-[70vh]"
      }`}
    >
      <style jsx>{`
        @keyframes gift-pop {
          0% { opacity: 0; transform: scale(0.7); }
          60% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-gift-pop { animation: gift-pop 0.45s ease-out; }
      `}</style>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-sm font-semibold">
          {live ? (
            <>
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {snapshot.viewers} izliyor · ❤️ {snapshot.likes}
            </>
          ) : (
            "Yayın sona erdi"
          )}
        </span>
        {live && (isAuthor || canModerate) && (
          <button
            type="button"
            onClick={handleEnd}
            disabled={ending}
            className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {ending ? "Bitiriliyor..." : "Yayını bitir"}
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {live ? "Henüz mesaj yok. İlk mesajı sen yaz!" : "Bu yayında mesaj yok."}
          </p>
        )}
        {shown.map((item) => {
          if (item.kind === "gift") {
            const g = giftById.get(item.id);
            return g ? renderGift(g) : null;
          }
          const m = snapshot.messages.find((x) => x.id === item.id);
          if (!m) return null;
          if (m.body === LIVE_JOIN_TEXT) {
            return (
              <div key={m.id} className="py-0.5 text-center text-xs text-white/70 drop-shadow">
                👋 <span className="font-semibold">@{m.author.username}</span>{" "}
                katıldı
              </div>
            );
          }
          const mine = m.author.username === currentUsername;
          return (
            <div key={m.id} className="group text-sm drop-shadow">
              <span className="font-semibold text-white">@{m.author.username}</span>{" "}
              <RoleTag role={m.author.role as Role} />{" "}
              <span className="break-words text-white/90">{m.body}</span>{" "}
              {(canDelete || mine) && (
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(m.id)}
                  title="Mesajı sil"
                  className="ml-1 text-xs text-white/40 opacity-0 hover:text-red-400 group-hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {live ? (
        <>
          {panelOpen && (
            <div className="border-t border-white/10 p-2">
              <EmojiPicker
                tabs={["emoji"]}
                onEmoji={(e) => {
                  setText((t) => t + e);
                  inputRef.current?.focus();
                  setPanelOpen(false);
                }}
                onSticker={() => {}}
                onGif={() => {}}
              />
            </div>
          )}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              title="Emoji"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl transition active:scale-90 hover:bg-white/10"
            >
              😀
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Mesaj yaz..."
              maxLength={500}
              className="w-full rounded-full border border-white/10 bg-panel-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Gönder
            </button>
          </form>
        </>
      ) : (
        <p className="border-t border-white/10 p-3 text-center text-xs text-muted">
          Yayın sona erdiği için sohbet kapalı.
        </p>
      )}
      {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
