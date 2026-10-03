"use client";

import { useActionState } from "react";
import { adminAdjustCoinsAction, type CoinState } from "@/actions/coins";

/** Yönetici coin düzenleme formu: kullanıcı adı + miktar (eksi düşer). */
export function CoinAdjustForm() {
  const [state, action, pending] = useActionState<CoinState, FormData>(
    adminAdjustCoinsAction,
    null
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4"
    >
      <h3 className="text-sm font-bold">🪙 Coin ver / al</h3>
      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Bakiye güncellendi: {state.balance} 🪙
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="username"
          placeholder="kullanıcı adı (örn. zeynep)"
          autoComplete="off"
          className="flex-1 rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <input
          name="amount"
          type="number"
          placeholder="+100 / -50"
          className="w-full rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand sm:w-36"
        />
        <button
          disabled={pending}
          className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black disabled:opacity-60"
        >
          {pending ? "..." : "Uygula"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Pozitif sayı ekler (+100), negatif sayı düşer (−50). Her işlem deftere ve
        denetim kayıtlarına işlenir.
      </p>
    </form>
  );
}
