"use client";

import { useState } from "react";

export function ShareProfileButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/u/${username}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: `@${username} - Taktik` });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* iptal edildi */
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold hover:border-white/40"
    >
      {copied ? "Kopyalandı ✓" : "Paylaş"}
    </button>
  );
}
