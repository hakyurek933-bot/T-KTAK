"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteStoryAction, markStorySeenAction } from "@/actions/stories";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";

export type StoryItem = {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

/** Tam ekran hikaye izleyici: ilerleme çubuğu, dokunmatik geçiş, izlendi işareti. */
export function StoryViewer({
  stories,
  isOwner,
}: {
  stories: StoryItem[];
  isOwner: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const story = stories[index];

  // İzlendi işaretle + 8 saniyede otomatik ilerle.
  useEffect(() => {
    if (!story) return;
    markStorySeenAction(story.id).catch(() => {});
    timer.current = setTimeout(() => {
      if (index < stories.length - 1) setIndex(index + 1);
    }, 8000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [story, index, stories.length]);

  if (!story) return null;

  async function handleDelete() {
    if (!confirm("Bu hikaye silinsin mi?")) return;
    setDeleting(true);
    try {
      await deleteStoryAction(story.id);
      const rest = stories.filter((s) => s.id !== story.id);
      if (rest.length === 0) router.push("/");
      else setIndex(Math.min(index, rest.length - 1));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-2xl bg-black sm:max-h-[80vh]">
      {story.mediaType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" />
      ) : (
        <video
          key={story.id}
          src={story.mediaUrl}
          autoPlay
          muted
          playsInline
          loop
          className="h-full w-full object-contain"
        />
      )}

      {/* İlerleme çubukları */}
      <div className="absolute inset-x-2 top-2 flex gap-1">
        {stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className={`h-full bg-white ${i < index ? "w-full" : i === index ? "animate-story-progress" : "w-0"}`}
            />
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes story-progress {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-story-progress {
          animation: story-progress 8s linear forwards;
        }
      `}</style>

      {/* Üst bar */}
      <div className="absolute inset-x-0 top-4 flex items-center gap-2 px-3">
        <Avatar user={story.author} size={32} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${story.author.username}`}
            className="block truncate text-sm font-semibold text-white drop-shadow"
          >
            @{story.author.username}
          </Link>
          <p className="text-[11px] text-white/70">{timeAgo(story.createdAt)}</p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur disabled:opacity-60"
          >
            {deleting ? "..." : "Sil"}
          </button>
        )}
        <Link
          href="/"
          className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
          aria-label="Kapat"
        >
          ✕
        </Link>
      </div>

      {/* Dokunmatik geçiş bölgeleri */}
      <button
        type="button"
        aria-label="Önceki"
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
        className="absolute inset-y-0 left-0 w-1/3"
      />
      <button
        type="button"
        aria-label="Sonraki"
        onClick={() => setIndex((i) => Math.min(stories.length - 1, i + 1))}
        className="absolute inset-y-0 right-0 w-1/3"
      />

      {story.caption && (
        <p className="absolute inset-x-0 bottom-3 px-4 text-center text-sm text-white drop-shadow">
          {story.caption}
        </p>
      )}
    </div>
  );
}
