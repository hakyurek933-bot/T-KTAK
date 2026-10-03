"use client";

import { useState } from "react";
import { claimDailyBonusAction } from "@/actions/coins";

/** Günlük giriş bonusu butonu (+50 coin, günde bir kez). */
export function DailyBonusButton({
  claimedToday,
  balance,
}: {
  claimedToday: boolean;
  balance: number;
}) {
  const [claimed, setClaimed] = useState(claimedToday);
  const [coins, setCoins] = useState(balance);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClaim() {
    if (pending || claimed) return;
    setPending(true);
    setMessage(null);
    const res = await claimDailyBonusAction();
    if (res?.error) {
      setMessage(res.error);
    } else {
      setClaimed(true);
      if (res?.balance !== undefined) setCoins(res.balance);
      setMessage("Günlük bonus alındı! +50 🪙");
    }
    setPending(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-2.5">
      <span className="text-sm font-bold">🪙 {coins} coin</span>
      {claimed ? (
        <span className="text-xs text-muted">Bugünkü bonus alındı ✓</span>
      ) : (
        <button
          type="button"
          onClick={handleClaim}
          disabled={pending}
          className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-black disabled:opacity-60"
        >
          {pending ? "Alınıyor..." : "🎁 Günlük +50 coin al"}
        </button>
      )}
      {message && (
        <span
          className={`w-full text-xs ${message.includes("alındı") || message.includes("Alındı") ? "text-emerald-400" : "text-red-400"}`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
