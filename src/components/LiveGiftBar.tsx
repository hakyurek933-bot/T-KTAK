"use client";

import { useState } from "react";
import { sendGiftAction } from "@/actions/coins";
import { GIFTS } from "@/lib/coins";

const COUNTS = [1, 5, 10];

/** Canlı yayın hediye barı: hediye seç, adet seç, gönder. */
export function LiveGiftBar({
  roomId,
  balance,
}: {
  roomId: string;
  balance: number;
}) {
  const [giftKey, setGiftKey] = useState("rose");
  const [count, setCount] = useState(1);
  const [coins, setCoins] = useState(balance);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const gift = GIFTS.find((g) => g.key === giftKey) ?? GIFTS[0];
  const total = gift.cost * count;

  async function handleSend() {
    if (sending) return;
    setSending(true);
    setMessage(null);
    const res = await sendGiftAction({ roomId, gift: gift.key, count });
    if (res?.error) {
      setMessage(res.error);
      setIsError(true);
    } else {
      setMessage(`${gift.emoji} ${gift.name} x${count} gönderildi!`);
      setIsError(false);
      if (res?.balance !== undefined) setCoins(res.balance);
    }
    setSending(false);
  }

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-pink-500/10 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">🎁 Hediye gönder</span>
        <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
          🪙 {coins} coin
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {GIFTS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGiftKey(g.key)}
            title={`${g.name} (${g.cost})`}
            className={`flex flex-col items-center rounded-xl border py-1.5 text-lg transition active:scale-95 ${
              giftKey === g.key
                ? "border-amber-400 bg-amber-400/15"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <span>{g.emoji}</span>
            <span className="text-[10px] text-muted">{g.cost}🪙</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex gap-1">
          {COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCount(c)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                count === c
                  ? "bg-amber-400 text-black"
                  : "bg-white/10 text-muted hover:text-white"
              }`}
            >
              x{c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || coins < total}
          className="ml-auto rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-5 py-1.5 text-sm font-bold text-black disabled:opacity-40"
        >
          {sending ? "..." : `Gönder (${total}🪙)`}
        </button>
      </div>
      {coins < total && (
        <p className="mt-1.5 text-xs text-muted">
          Yetersiz coin — profilinden günlük bonusunu alabilirsin 🎁
        </p>
      )}
      {message && (
        <p className={`mt-1.5 text-xs ${isError ? "text-red-400" : "text-emerald-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
