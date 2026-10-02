"use client";

import { useTransition } from "react";
import { markNotificationsRead } from "@/actions/notifications";

export function MarkAllRead() {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await markNotificationsRead(); })}
      className="text-sm font-medium text-brand-2 hover:underline disabled:opacity-60"
    >
      Tümünü okundu işaretle
    </button>
  );
}
