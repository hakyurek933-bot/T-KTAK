"use client";

import { useActionState } from "react";
import { unbanUserAction, type AdminState } from "@/actions/admin";

export function UnbanButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    unbanUserAction,
    null
  );

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <button
        disabled={pending}
        className="rounded-lg bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "..." : "Banı kaldır"}
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
