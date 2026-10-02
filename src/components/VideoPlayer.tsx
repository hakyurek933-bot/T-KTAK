"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "@/components/icons";

/**
 * Tam ekran TikTok tarzı video oynatıcı.
 * - Görünür olduğunda otomatik oynar
 * - Dokununca duraklat/oynat
 * - Sessiz başlar, sağ üstteki butonla ses açılır
 */
export function VideoPlayer({
  src,
  poster,
  onDoubleClick,
}: {
  src: string;
  poster?: string;
  onDoubleClick?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.play()
              .then(() => setPaused(false))
              .catch(() => setPaused(true));
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function togglePlay() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  }

  function handleDoubleClick() {
    if (!onDoubleClick) return;
    onDoubleClick();
    setBurst((b) => b + 1);
  }

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-black p-6 text-center text-sm text-muted">
        <div>
          <p className="text-3xl">🚫</p>
          <p className="mt-2">Video oynatılamadı</p>
          <p className="mt-1 text-xs">Bağlantı geçersiz olabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        onClick={togglePlay}
        onDoubleClick={handleDoubleClick}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress((v.currentTime / v.duration) * 100);
        }}
        className="h-full w-full cursor-pointer object-contain"
      />

      {/* Çift tık beğeni animasyonu */}
      {burst > 0 && (
        <span
          key={burst}
          className="pointer-events-none absolute inset-0 z-10 grid animate-pop place-items-center"
        >
          <svg width="90" height="90" viewBox="0 0 24 24" fill="#fe2c55" className="drop-shadow-lg">
            <path d="M12 21s-7.5-4.7-10-9.3C.5 8 2.3 4.5 5.8 4.1 8 3.9 9.7 5 12 7.2c2.3-2.2 4-3.3 6.2-3.1 3.5.4 5.3 3.9 3.8 7.6C19.5 16.3 12 21 12 21z" />
          </svg>
        </span>
      )}

      {paused && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Oynat"
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
            <PlayIcon size={30} />
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setMuted((m) => !m);
          if (ref.current) ref.current.muted = !muted;
        }}
        className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-sm text-white backdrop-blur hover:bg-black/70"
        aria-label={muted ? "Sesi aç" : "Sesi kapat"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* İlerleme çubuğu */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-0.5 bg-white/20">
        <div className="h-full bg-white/80" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
