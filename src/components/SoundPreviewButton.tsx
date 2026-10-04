"use client";

import { useRef, useState } from "react";

/** Ses önizleme düğmesi (ses sayfası başlığı için). */
export function SoundPreviewButton({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.src = url;
      el.play().catch(() => {});
      setPlaying(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold hover:bg-white/15"
      >
        {playing ? "⏸ Durdur" : "▶ Önizlemeyi dinle"}
      </button>
      <audio ref={ref} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} className="hidden" />
    </>
  );
}
