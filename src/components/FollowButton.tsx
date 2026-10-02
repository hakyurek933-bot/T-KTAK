"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/actions/follow";

export function FollowButton({
  targetId,
  initialFollowing,
  size = "md",
}: {
  targetId: string;
  initialFollowing: boolean;
  size?: "md" | "lg";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        const res = await toggleFollowAction(targetId);
        setFollowing(res.following);
      } catch {
        setFollowing(!next);
      }
    });
  }

  const pad = size === "lg" ? "px-6 py-2.5 text-sm" : "px-4 py-1.5 text-sm";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-full font-semibold transition disabled:opacity-60 ${pad} ${
        following
          ? "border border-white/20 text-white hover:border-white/40"
          : "bg-brand text-white hover:bg-brand/90"
      }`}
    >
      {following ? "Takibi bırak" : "Takip et"}
    </button>
  );
}
