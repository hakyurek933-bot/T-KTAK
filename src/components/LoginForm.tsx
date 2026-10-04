"use client";

import { useActionState, useState } from "react";
import {
  loginAction,
  requestLoginCodeAction,
  type ActionState,
} from "@/actions/auth";

const inputCls =
  "w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[#e2482f]/40";

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
  const [showPass, setShowPass] = useState(false);

  if (mode === "code") {
    return (
      <div className="flex flex-col gap-4">
        <form action={codeAction} className="flex flex-col gap-3">
          {codeState?.error && (
            <p className="text-xs text-red-600">{codeState.error}</p>
          )}
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-posta adresin"
            className={inputCls}
          />
          <button
            disabled={codePending}
            className="rounded-xl bg-gradient-to-r from-[#e2482f] to-[#b91c1c] py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
          >
            {codePending ? "Gönderiliyor..." : "Giriş kodu gönder"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-center text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← Şifreyle girişe dön
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <input
        name="identifier"
        autoComplete="username"
        placeholder="Kullanıcı adı veya e-posta"
        className={inputCls}
      />
      <div className="relative">
        <input
          name="password"
          type={showPass ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Şifre"
          className={`${inputCls} pr-16`}
        />
        <button
          type="button"
          onClick={() => setShowPass((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 hover:text-neutral-700"
        >
          {showPass ? "Gizle" : "Göster"}
        </button>
      </div>
      <button
        disabled={pending}
        className="mt-1 rounded-xl bg-gradient-to-r from-[#e2482f] to-[#b91c1c] py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        veya
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
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
        href="/api/auth/kick"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#0e0e10] py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#1a1a1e]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#53FC18">
          <path d="M4 2h4v9.2L16.5 2H21l-6.8 7.6L21.5 22h-4.6l-5-7.1L8 18.4V22H4V2z" />
        </svg>
        Kick ile giriş yap
      </a>
      <button
        type="button"
        onClick={() => setMode("code")}
        className="text-center text-sm text-neutral-500 hover:text-neutral-800"
      >
        E-posta koduyla giriş yap
      </button>
    </form>
  );
}
