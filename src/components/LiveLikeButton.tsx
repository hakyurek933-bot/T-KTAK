"use client";

import { useState } from "react";
import { likeLiveAction } from "@/actions/coins";

type Heart = { id: number; left: number; size: number };

/** TikTok tarzı beğeni: dokundukça kalpler uçuşur, sayaç artar. */
export function LiveLikeButton({
  roomId,
  initialLikes,
}: {
  roomId: string;
  initialLikes: number;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleLike() {
    // Kalp animasyonu anında, sayaç sunucudan.
    const id = Date.now() + Math.random();
    setHearts((h) => [
      ...h.slice(-14),
      { id, left: 20 + Math.random() * 60, size: 20 + Math.random() * 22 },
    ]);
    setTimeout(() => {
      setHearts((h) => h.filter((x) => x.id !== id));
    }, 1100);
    if (busy) return;
    setBusy(true);
    try {
      const res = await likeLiveAction(roomId);
      if (res.likes !== undefined) setLikes(res.likes);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLike}
      className="relative flex items-center gap-2 overflow-visible rounded-full border border-pink-500/40 bg-pink-500/10 px-4 py-2 text-sm font-bold text-white active:scale-95"
      title="Yayını beğen"
    >
      <span className="text-lg">❤️</span>
      <span>{likes}</span>
      {hearts.map((h) => (
        <span
          key={h.id}
          className="pointer-events-none absolute bottom-full animate-float-heart"
          style={{ left: `${h.left}%`, fontSize: h.size }}
        >
          ❤️
        </span>
      ))}
      <style jsx>{`
        @keyframes float-heart {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.6) rotate(-10deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-90px) scale(1.3) rotate(12deg);
          }
        }
        .animate-float-heart {
          animation: float-heart 1.1s ease-out forwards;
        }
      `}</style>
    </button>
  );
}
