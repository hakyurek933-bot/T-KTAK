"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBlockAction } from "@/actions/blocks";

/** Engelle / engeli kaldır butonu (profil sayfası için). */
export function BlockButton({
  targetId,
  targetUsername,
  initialBlocked,
}: {
  targetId: string;
  targetUsername: string;
  initialBlocked: boolean;
}) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (
      !blocked &&
      !confirm(
        `@${targetUsername} engellensin mi? Videolarını görmezsin, mesajlaşamazsın.`
      )
    )
      return;
    const next = !blocked;
    setBlocked(next);
    startTransition(async () => {
      try {
        const res = await toggleBlockAction(targetId);
        if (res.error) {
          setBlocked(!next);
          alert(res.error);
        } else {
          setBlocked(res.blocked ?? next);
          router.refresh();
        }
      } catch {
        setBlocked(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
        blocked
          ? "border border-white/20 text-white hover:border-white/40"
          : "border border-red-500/40 text-red-400 hover:bg-red-500/10"
      }`}
    >
      {blocked ? "Engeli kaldır" : "Engelle"}
    </button>
  );
}
