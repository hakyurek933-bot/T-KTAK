"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  loginWithCodeAction,
  resendCodeAction,
  verifyEmailAction,
  type ActionState,
} from "@/actions/auth";

export function VerifyForm({ email, mode = "signup" }: { email: string; mode?: "signup" | "login" }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mode === "login" ? loginWithCodeAction : verifyEmailAction,
    null
  );
  const [resendState, resendAction, resending] = useActionState<
    ActionState,
    FormData
  >(resendCodeAction, null);

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
            {state.error}
          </p>
        )}
        <input type="hidden" name="email" value={email} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">6 haneli kod</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-center text-xl tracking-[0.5em] text-white outline-none focus:border-brand"
          />
        </label>
        <button
          disabled={pending}
          className="rounded-xl bg-brand py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Doğrulanıyor..." : mode === "login" ? "Giriş yap" : "Doğrula"}
        </button>
      </form>

      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <button
          disabled={resending}
          className="w-full text-center text-sm text-muted hover:text-white disabled:opacity-60"
        >
          {resending ? "Gönderiliyor..." : "Kodu tekrar gönder"}
        </button>
      </form>
      {resendState?.error && (
        <p className="text-center text-xs text-red-400">{resendState.error}</p>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand-2 hover:underline">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
