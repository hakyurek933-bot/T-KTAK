"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/actions/auth";

/** Tehlikeli Bölge: hesap kalıcı silme (kullanıcı adı onaylı). */
export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, null);
  const [armed, setArmed] = useState(false);

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-red-300">
        Tehlikeli Bölge
      </h2>
      {!armed ? (
        <>
          <p className="mb-3 text-muted">
            Hesabın, videoların, yorumların ve coinlerin kalıcı olarak silinir.
            Bu işlem geri alınamaz.
          </p>
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10"
          >
            Hesabımı silmek istiyorum
          </button>
        </>
      ) : (
        <form action={action} className="flex flex-col gap-2">
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}
          <p className="text-muted">
            Onay için kullanıcı adını yaz:{" "}
            <span className="font-bold text-white">@{username}</span>
          </p>
          <input
            name="confirm"
            autoComplete="off"
            placeholder={username}
            className="rounded-xl border border-red-500/30 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-red-500"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? "..." : "Evet, kalıcı olarak sil"}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-muted hover:text-white"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
