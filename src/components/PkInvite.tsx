"use client";

import { useState } from "react";
import { challengePkAction } from "@/actions/pk";

/** ⚔️ PK davet düğmesi (yalnızca yayıncı): diğer canlı odalara meydan okur. */
export function PkInvite({
  myRoomId,
  rooms,
}: {
  myRoomId: string;
  rooms: { id: string; title: string; author: { username: string } }[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const others = rooms.filter((r) => r.id !== myRoomId);
  if (others.length === 0) return null;

  async function handleChallenge(id: string) {
    setBusy(id);
    setMessage(null);
    const res = await challengePkAction(myRoomId, id);
    if (res.error) setMessage(res.error);
    else {
      setMessage("Davet gönderildi! ⚔️");
      setOpen(false);
    }
    setBusy(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMessage(null);
        }}
        className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-xs font-extrabold text-white active:scale-95"
      >
        ⚔️ PK
      </button>
      {message && <p className="mt-1 text-[11px] text-muted">{message}</p>}
      {open && (
        <div className="absolute bottom-10 right-0 z-30 w-64 rounded-2xl border border-white/15 bg-panel p-2 shadow-2xl">
          <p className="px-2 py-1 text-xs font-bold text-muted">
            Kime meydan okuyorsun?
          </p>
          {others.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={busy !== null}
              onClick={() => handleChallenge(r.id)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.title}</span>
                <span className="text-xs text-muted">@{r.author.username}</span>
              </span>
              <span className="text-xs font-bold text-pink-400">
                {busy === r.id ? "..." : "⚔️"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
