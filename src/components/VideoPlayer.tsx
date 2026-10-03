"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "@/components/icons";

// Oturum boyu hatırlanan ses tercihi (varsayılan AÇIK; kapatanın seçimi hatırlanır).
let sessionMuted = false;
let hintShown = false;

/**
 * Tam ekran TikTok tarzı video oynatıcı.
 * - Görünür olduğunda otomatik oynar
 * - Dokununca duraklat/oynat
 * - Sessiz başlar; ilk videoda "sesi aç" işareti çıkar, seçim oturum boyu hatırlanır
 */
export function VideoPlayer({
  src,
  poster,
  onDoubleClick,
  onFirstVisible,
}: {
  src: string;
  poster?: string;
  onDoubleClick?: () => void;
  onFirstVisible?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const seenRef = useRef(false);
  const visibleRef = useRef(onFirstVisible);

  useEffect(() => {
    visibleRef.current = onFirstVisible;
  }, [onFirstVisible]);
  const [muted, setMuted] = useState(sessionMuted);
  const [showHint, setShowHint] = useState(!hintShown);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);

  function toggleMute() {
    setMuted((m) => {
      sessionMuted = !m;
      return !m;
    });
    hintShown = true;
    setShowHint(false);
    if (ref.current) ref.current.muted = !ref.current.muted;
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!seenRef.current) {
              seenRef.current = true;
              visibleRef.current?.();
            }
            el.muted = sessionMuted;
            setMuted(sessionMuted);
            el.play()
              .then(() => setPaused(false))
              .catch(() => {
                // Tarayıcı sesli otomatik oynatmayı engellediyse sessiz dene.
                el.muted = true;
                setMuted(true);
                setShowHint(true);
                el
                  .play()
                  .then(() => setPaused(false))
                  .catch(() => setPaused(true));
              });
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [retryKey]);

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
          <p className="mt-1 text-xs">
            Dosya bu tarayıcıda desteklenmiyor ya da bağlantı geçersiz olabilir.
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setRetryKey((k) => k + 1);
            }}
            className="mt-3 rounded-full border border-white/20 px-5 py-1.5 text-xs font-semibold text-white hover:border-white/50"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        key={retryKey}
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
        onClick={toggleMute}
        className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-lg text-white backdrop-blur hover:bg-black/70 active:scale-90"
        aria-label={muted ? "Sesi aç" : "Sesi kapat"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* İlk videoda ses işareti (telefonda sesin kapalı kaldığı fark edilsin) */}
      {showHint && muted && !failed && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-32 left-1/2 z-20 -translate-x-1/2 animate-pulse rounded-full bg-white/95 px-5 py-2.5 text-sm font-bold text-black shadow-lg active:scale-95"
        >
          🔊 Sesi açmak için dokun
        </button>
      )}

      {/* İlerleme çubuğu */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-0.5 bg-white/20">
        <div className="h-full bg-white/80" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
