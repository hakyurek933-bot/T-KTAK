"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    loginAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Kullanıcı adı</span>
        <input
          name="username"
          autoComplete="username"
          placeholder="kurucu"
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Şifre</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-white outline-none focus:border-brand"
        />
      </label>
      <button
        disabled={pending}
        className="mt-1 rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor..." : "Giriş yap"}
      </button>
      <p className="text-center text-sm text-muted">
        Hesabın yok mu?{" "}
        <Link href="/signup" className="font-medium text-brand-2 hover:underline">
          Kayıt ol
        </Link>
      </p>
    </form>
  );
}
