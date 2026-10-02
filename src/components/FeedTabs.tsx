"use client";

import Link from "next/link";

export function FeedTabs({ active }: { active: "foryou" | "following" }) {
  return (
    <div className="flex items-center gap-4 text-sm font-semibold">
      <Link
        href="/"
        className={`relative pb-1 ${
          active === "foryou" ? "text-white" : "text-white/60 hover:text-white/80"
        }`}
      >
        Sana Özel
        {active === "foryou" && (
          <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 w-6 rounded-full bg-white" />
        )}
      </Link>
      <span className="text-white/20">|</span>
      <Link
        href="/?tab=following"
        className={`relative pb-1 ${
          active === "following" ? "text-white" : "text-white/60 hover:text-white/80"
        }`}
      >
        Takip
        {active === "following" && (
          <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 w-6 rounded-full bg-white" />
        )}
      </Link>
    </div>
  );
}
