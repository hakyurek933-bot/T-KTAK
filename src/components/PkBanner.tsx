"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPkState,
  respondPkAction,
  type PkState,
} from "@/actions/pk";

/** ⚔️ PK bandı: davet / skor / geri sayım / sonuç. 5 sn'de tazelenir. */
export function PkBanner({
  roomId,
  canRespond,
}: {
  roomId: string;
  canRespond: boolean;
}) {
  const [pk, setPk] = useState<PkState>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const s = await getPkState(roomId);
        if (active) setPk(s);
      } catch {
        /* sessizce yoksay */
      }
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pk || pk.status !== "ACCEPTED") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pk]);

  if (!pk || pk.status === "DECLINED") return null;

  if (pk.status === "PENDING") {
    const incoming = pk.mine === "B";
    return (
      <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-r from-purple-500/15 to-pink-500/15 p-3 text-sm">
        <p className="font-extrabold">⚔️ PK {incoming ? "daveti!" : "bekleniyor..."}</p>
        <p className="mt-0.5 text-xs text-muted">
          {incoming ? (
            <>
              <span className="font-semibold text-white">@{pk.roomA.author.username}</span>{" "}
              seni düelloya çağırıyor!
            </>
          ) : (
            <>
              <span className="font-semibold text-white">@{pk.roomB.author.username}</span>{" "}
              yanıtı bekleniyor...
            </>
          )}
        </p>
        {incoming && canRespond && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await respondPkAction(pk.id, true);
                const s = await getPkState(roomId);
                setPk(s);
                setBusy(false);
              }}
              className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "..." : "Kabul et ⚔️"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await respondPkAction(pk.id, false);
                setPk(null);
                setBusy(false);
              }}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-muted hover:text-white disabled:opacity-60"
            >
              Reddet
            </button>
          </div>
        )}
      </div>
    );
  }

  if (pk.status === "ENDED") {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3 text-center text-sm">
        <p className="font-extrabold">🏆 PK bitti</p>
        <p className="text-xs text-muted">
          @{pk.roomA.author.username} {pk.scoreA} — {pk.scoreB} @{pk.roomB.author.username}
        </p>
      </div>
    );
  }

  // ACCEPTED: skor + geri sayım.
  const total = pk.scoreA + pk.scoreB;
  const pctA = total === 0 ? 50 : Math.round((pk.scoreA / total) * 100);
  const left = pk.endsAt ? Math.max(0, Math.floor((new Date(pk.endsAt).getTime() - now) / 1000)) : 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-purple-400/40 bg-gradient-to-r from-purple-500/15 to-pink-500/15 p-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-extrabold">⚔️ PK</span>
        <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-bold tabular-nums">
          ⏱ {mm}:{ss}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold">
        <Link href={`/live/${pk.roomA.id}`} className="w-20 truncate hover:underline">
          @{pk.roomA.author.username}
        </Link>
        <span className="tabular-nums">{pk.scoreA}</span>
        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all"
            style={{ width: `${pctA}%` }}
          />
        </div>
        <span className="tabular-nums">{pk.scoreB}</span>
        <Link href={`/live/${pk.roomB.id}`} className="w-20 truncate text-right hover:underline">
          @{pk.roomB.author.username}
        </Link>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted">
        Beğeni + hediye ile tarafını destekle! ❤️🎁
      </p>
    </div>
  );
}
