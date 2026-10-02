"use client";

import { useActionState } from "react";
import { changeRoleAction, type AdminState } from "@/actions/admin";
import type { Role } from "@prisma/client";

export function RoleSelect({
  userId,
  role,
  canChange,
}: {
  userId: string;
  role: Role;
  canChange: boolean;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    changeRoleAction,
    null
  );

  if (!canChange) {
    return <span className="text-xs text-muted">{role}</span>;
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={pending}
        className="rounded-lg border border-white/10 bg-panel-2 px-2 py-1 text-xs outline-none focus:border-brand"
      >
        <option value="USER">Üye</option>
        <option value="MOD">Moderatör</option>
        <option value="FOUNDER">Kurucu</option>
      </select>
      <button
        disabled={pending}
        className="rounded-lg border border-white/15 px-2 py-1 text-xs hover:border-white/30 disabled:opacity-50"
      >
        {pending ? "..." : "Kaydet"}
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
