"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction } from "@/actions/profile";
import { AvatarUpload } from "@/components/AvatarUpload";

type ProfileState = { error?: string; success?: string } | null;

export function ProfileSettingsForm({
  username,
  displayName,
  bio,
  avatarUrl,
}: {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-panel p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Profil bilgileri
      </h2>
      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {state.success}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Görünen ad</span>
        <input
          name="displayName"
          defaultValue={displayName}
          maxLength={40}
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Biyografi</span>
        <textarea
          name="bio"
          defaultValue={bio}
          maxLength={160}
          rows={3}
          placeholder="Kendinden kısaca bahset..."
          className="resize-none rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Profil fotoğrafı</span>
        <AvatarUpload
          username={username}
          displayName={displayName}
          initialUrl={avatarUrl}
        />
      </div>

      <button
        disabled={pending}
        className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    changePasswordAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-panel p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Şifre değiştir
      </h2>
      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {state.success}
        </p>
      )}

      <input
        name="current"
        type="password"
        placeholder="Mevcut şifre"
        autoComplete="current-password"
        className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <input
        name="next"
        type="password"
        placeholder="Yeni şifre"
        autoComplete="new-password"
        className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <input
        name="confirm"
        type="password"
        placeholder="Yeni şifre (tekrar)"
        autoComplete="new-password"
        className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
      />

      <button
        disabled={pending}
        className="self-start rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Güncelleniyor..." : "Şifreyi güncelle"}
      </button>
    </form>
  );
}
