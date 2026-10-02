"use client";

import { useEffect, useRef, useState } from "react";
import { FeedItem, type FeedItemData } from "@/components/FeedItem";

/**
 * Tam ekran dikey kaydırmalı akış (snap scroll).
 * Klavye okları ve fare tekerleği ile video değiştirilebilir.
 */
export function Feed({
  posts,
  currentUserId,
  canModerate,
  followedIds,
}: {
  posts: FeedItemData[];
  currentUserId?: string;
  canModerate: boolean;
  followedIds?: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const index = Math.round(el.scrollTop / el.clientHeight);
      setActive(index);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = Math.min(
        Math.max(0, Math.round(el.scrollTop / el.clientHeight) + dir),
        posts.length - 1
      );
      el.scrollTo({ top: next * el.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [posts.length]);

  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain"
      >
        {posts.map((post) => (
          <div key={post.id} className="h-full w-full snap-start snap-always">
            <FeedItem
              post={post}
              currentUserId={currentUserId}
              canModerate={canModerate}
              isFollowingAuthor={followedIds?.has(post.author.id) ?? false}
            />
          </div>
        ))}
      </div>

      {posts.length > 1 && (
        <div className="pointer-events-none absolute right-1 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-1.5 md:flex">
          {posts.slice(0, 12).map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i === active ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
