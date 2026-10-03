"use client";

import { useEffect, useRef, useState } from "react";
import {
  endLiveAction,
  getLiveSnapshot,
  sendLiveMessageAction,
  type LiveSnapshot,
} from "@/actions/live";
import { RoleTag } from "@/components/RoleTag";
import { timeAgo } from "@/lib/utils";
import type { Role } from "@prisma/client";

export function LiveChat({
  roomId,
  isLive,
  isAuthor,
  canModerate,
  initial,
}: {
  roomId: string;
  isLive: boolean;
  isAuthor: boolean;
  canModerate: boolean;
  initial: LiveSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 3 saniyede bir anlık görüntü (mesajlar + izleyici + durum).
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [snapshot.messages.length]);

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

  const live = snapshot.status === "LIVE";

  return (
    <div className="flex h-[60vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel md:h-[70vh]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-sm font-semibold">
          {live ? (
            <>
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {snapshot.viewers} izliyor · {snapshot.messages.length} mesaj
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
        {snapshot.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {live ? "Henüz mesaj yok. İlk mesajı sen yaz!" : "Bu yayında mesaj yok."}
          </p>
        )}
        {snapshot.messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold">@{m.author.username}</span>{" "}
            <RoleTag role={m.author.role as Role} />{" "}
            <span className="break-words text-foreground/90">{m.body}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {live ? (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-white/10 p-3"
        >
          <input
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
      ) : (
        <p className="border-t border-white/10 p-3 text-center text-xs text-muted">
          Yayın sona erdiği için sohbet kapalı.
        </p>
      )}
      {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
