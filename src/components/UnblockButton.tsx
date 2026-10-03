"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBlockAction } from "@/actions/blocks";

/** Engellenenler listesindeki küçük "Kaldır" butonu. */
export function UnblockButton({ targetId }: { targetId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await toggleBlockAction(targetId);
        router.refresh();
      } catch {
        /* sessizce yoksay */
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-muted hover:text-white disabled:opacity-60"
    >
      {isPending ? "..." : "Engeli kaldır"}
    </button>
  );
}
