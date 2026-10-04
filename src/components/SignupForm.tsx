"use client";

import { useActionState, useState } from "react";
import { signupAction, type ActionState } from "@/actions/auth";

const inputCls =
  "w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[#e2482f]/40";

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    signupAction,
    null
  );
  const [showPass, setShowPass] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <input
        name="displayName"
        placeholder="Görünen adın"
        className={inputCls}
      />
      <div className="flex items-center rounded-xl bg-neutral-100 pl-4 focus-within:ring-2 focus-within:ring-[#e2482f]/40">
        <span className="text-sm text-neutral-400">@</span>
        <input
          name="username"
          autoComplete="username"
          placeholder="kullanici_adi"
          className="w-full bg-transparent px-1.5 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
      <input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="E-posta adresin"
        className={inputCls}
      />
      <div className="relative">
        <input
          name="password"
          type={showPass ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Şifre (en az 6 karakter)"
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
      {/* Bot tuzağı: gerçek kullanıcılar görmez, botlar doldurur. */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <button
        disabled={pending}
        className="mt-1 rounded-xl bg-gradient-to-r from-[#e2482f] to-[#b91c1c] py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
      </button>
      <p className="text-center text-xs text-neutral-400">
        Kaydolarak +100 🪙 hoş geldin bonusu kazanırsın
      </p>
    </form>
  );
}
