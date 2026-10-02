"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  loginAction,
  requestLoginCodeAction,
  type ActionState,
} from "@/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    loginAction,
    null
  );
  const [codeState, codeAction, codePending] = useActionState<
    ActionState,
    FormData
  >(requestLoginCodeAction, null);
  const [mode, setMode] = useState<"password" | "code">("password");

  if (mode === "code") {
    return (
      <div className="flex flex-col gap-4">
        <form action={codeAction} className="flex flex-col gap-4">
          {codeState?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
              {codeState.error}
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">E-posta</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@eposta.com"
              className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-white outline-none focus:border-brand"
            />
          </label>
          <button
            disabled={codePending}
            className="mt-1 rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
          >
            {codePending ? "Gönderiliyor..." : "Giriş kodu gönder"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-center text-sm text-muted hover:text-white"
        >
          ← Şifreyle girişe dön
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Kullanıcı adı veya e-posta</span>
        <input
          name="identifier"
          autoComplete="username"
          placeholder="kurucu veya ornek@eposta.com"
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
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-white/10" />
        veya
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white py-2.5 font-semibold text-neutral-900 transition hover:bg-neutral-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c0 1.1-.7 2.7-2.3 3.8l-.1.3 3.3 2.6.2.1c2-1.9 4-4.6 3.9-9z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5l-.3.1-3.1 2.4-.1.3C3.6 21.3 7.5 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.3L2 6.9l-.2.1C.7 9 0 10.4 0 12s.7 3 1.9 5l3.3-2.6z"
          />
          <path
            fill="#EA4335"
            d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.6 2.7 1.8 6.9l3.4 2.7c.9-2.9 3.6-5 6.8-5z"
          />
        </svg>
        Google ile giriş yap
      </a>
      <a
        href="/api/auth/github"
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-panel-2 py-2.5 font-semibold text-white transition hover:bg-white/10"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C16.4 4.7 17.4 5 17.4 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
        </svg>
        GitHub ile giriş yap
      </a>
      <button
        type="button"
        onClick={() => setMode("code")}
        className="text-center text-sm text-muted hover:text-white"
      >
        E-posta koduyla giriş yap
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
