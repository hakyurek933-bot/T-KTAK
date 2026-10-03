"use client";

import { useState } from "react";

/** Hata dayanımlı video küçük resmi.
 * Video yüklenemezse siyah kutu yerine 🚫 gösterir. */
export function VideoThumb({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="grid h-full w-full place-items-center bg-black text-2xl"
        title="Video oynatılamıyor"
      >
        🚫
      </div>
    );
  }

  return (
    <video
      src={src}
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className={className ?? "h-full w-full object-cover"}
    />
  );
}
