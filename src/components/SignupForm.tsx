"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type ActionState } from "@/actions/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    signupAction,
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
        <span className="text-muted">Görünen ad</span>
        <input
          name="displayName"
          placeholder="Adın Soyadın"
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Kullanıcı adı</span>
        <div className="flex items-center rounded-xl border border-white/10 bg-panel-2 pl-3 focus-within:border-brand">
          <span className="text-muted">@</span>
          <input
            name="username"
            autoComplete="username"
            placeholder="kullanici_adi"
            className="w-full bg-transparent px-2 py-2.5 text-white outline-none"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Şifre</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="En az 6 karakter"
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-white outline-none focus:border-brand"
        />
      </label>
      <button
        disabled={pending}
        className="mt-1 rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Hesap oluşturuluyor..." : "Kayıt ol"}
      </button>
      <p className="text-center text-sm text-muted">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="font-medium text-brand-2 hover:underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
