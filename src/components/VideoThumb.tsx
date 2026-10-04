"use client";

import { useState } from "react";

/** Hata dayanımlı medya küçük resmi.
 * Video yüklenemezse/oynatılamazsa siyah kutu yerine 🚫 gösterir. */
export function VideoThumb({
  src,
  kind = "video",
  className,
}: {
  src: string;
  kind?: "video" | "image";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="grid h-full w-full place-items-center bg-black text-2xl"
        title="Medya oynatılamıyor"
      >
        🚫
      </div>
    );
  }

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={className ?? "h-full w-full object-cover"}
      />
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
