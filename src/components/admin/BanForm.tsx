"use client";

import { useActionState } from "react";
import { banUserAction, type AdminState } from "@/actions/admin";

export function BanForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    banUserAction,
    null
  );

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="reason"
        placeholder="Sebep"
        maxLength={200}
        className="w-28 rounded-lg border border-white/10 bg-panel-2 px-2 py-1 text-xs outline-none focus:border-brand"
      />
      <button
        disabled={pending}
        className="rounded-lg bg-red-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {pending ? "..." : "Banla"}
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
