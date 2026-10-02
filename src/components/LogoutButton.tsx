"use client";

import { logoutAction } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted hover:border-white/20 hover:text-white"
      >
        Çıkış
      </button>
    </form>
  );
}
