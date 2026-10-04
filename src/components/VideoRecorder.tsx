"use client";

import { useEffect, useRef, useState } from "react";

const FILTERS = [
  { key: "dogal", name: "Doğal", css: "none" },
  { key: "sb", name: "S/B", css: "grayscale(1)" },
  { key: "sepya", name: "Sepya", css: "sepia(0.8)" },
  { key: "canli", name: "Canlı", css: "saturate(1.8) contrast(1.1)" },
  { key: "soguk", name: "Soğuk", css: "saturate(0.9) hue-rotate(-20deg)" },
  { key: "sicak", name: "Sıcak", css: "sepia(0.4) saturate(1.6) hue-rotate(-15deg)" },
  { key: "ruya", name: "Rüya", css: "blur(1px) saturate(1.4) brightness(1.1)" },
] as const;

const DURATIONS = [15, 60];

function nowMs() {
  return Date.now();
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const cands = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of cands) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* dene */
    }
  }
  return "";
}

/** TikTok tarzı kamera kaydı: efekt + ayna + süre + geri sayım.
 *  Efekt canvas'a işlenir, kayıtlı videoda kalır. */
export function VideoRecorder({
  onDone,
  song = null,
}: {
  onDone: (file: File) => void;
  song?: { name: string; url: string } | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [filter, setFilter] = useState<string>("none");
  const [mirror, setMirror] = useState(true);
  const [maxDur, setMaxDur] = useState(15);
  const [countdownOn, setCountdownOn] = useState(true);
  const [phase, setPhase] = useState<"idle" | "countdown" | "recording">("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);

  // Kapanışta her şeyi durdur (durum yazılmaz).
  useEffect(() => {
    const musicEl = musicRef.current;
    return () => {
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      if (musicEl) {
        musicEl.pause();
        musicEl.removeAttribute("src");
      }
    };
  }, []);

  // Önizleme döngüsü: kamerayı filtreyle canvas'a çiz (durum yazılmaz).
  useEffect(() => {
    if (!started) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    function draw() {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh) {
        const targetW = 480;
        const scale = targetW / vw;
        const w = targetW;
        const h = Math.round(vh * scale);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.save();
        ctx.filter = filter;
        if (mirror) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, filter, mirror]);

  function later(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  async function startCamera(nextFacing: "user" | "environment") {
    setError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: true,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      video.muted = true;
      await video.play().catch(() => {});
      setStarted(true);
    } catch {
      setError("Kamera açılamadı. İzin verdiğinden emin ol.");
    }
  }

  function beginRecording() {
    const canvas = canvasRef.current;
    const mic = streamRef.current;
    if (!canvas || !mic) return;
    limitRef.current = maxDur;
    const mime = pickMime();
    const out: MediaStream = canvas.captureStream(30);
    // Ses miksi: mikrofon + seçiliyse müzik (şarkıyla çek).
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ac = new AC();
      audioCtxRef.current = ac;
      void ac.resume().catch(() => {});
      const dest = ac.createMediaStreamDestination();
      const micSrc = ac.createMediaStreamSource(mic);
      micSrc.connect(dest);
      const musicEl = musicRef.current;
      if (song?.url && musicEl) {
        musicEl.src = song.url;
        musicEl.loop = true;
        musicEl.crossOrigin = "anonymous";
        musicEl.volume = 1;
        void musicEl.play().catch(() => {});
        try {
          const musSrc = ac.createMediaElementSource(musicEl);
          const gain = ac.createGain();
          gain.gain.value = 0.8;
          musSrc.connect(gain);
          gain.connect(dest);
        } catch {
          /* müzik karıştırılamazsa yalnızca mikrofon */
        }
      }
      dest.stream.getAudioTracks().forEach((t) => out.addTrack(t));
    } catch {
      mic.getAudioTracks().forEach((t) => out.addTrack(t));
    }
    const rec = new MediaRecorder(out, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const file = new File(chunksRef.current, `taktik-kayit-${nowMs()}.${ext}`, {
        type: mime ? mime.split(";")[0] : "video/webm",
      });
      const m = musicRef.current;
      if (m) m.pause();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setPhase("idle");
      setElapsed(0);
      onDone(file);
    };
    recRef.current = rec;
    rec.start(250);
    startAtRef.current = nowMs();
    setPhase("recording");
    setElapsed(0);
    tickClock();
  }

  function tickClock() {
    later(() => {
      const passed = Math.floor((nowMs() - startAtRef.current) / 1000);
      if (passed >= limitRef.current) {
        recRef.current?.stop();
        return;
      }
      setElapsed(passed);
      tickClock();
    }, 500);
  }

  const limitRef = useRef(maxDur);

  function startRecording() {
    if (phase !== "idle" || !started) return;
    setError(null);
    if (countdownOn) {
      setPhase("countdown");
      setCount(3);
      later(() => setCount(2), 1000);
      later(() => setCount(1), 2000);
      later(() => beginRecording(), 3000);
    } else {
      beginRecording();
    }
  }

  function stopRecording() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const m = musicRef.current;
    if (m) m.pause();
    recRef.current?.stop();
  }

  async function flip() {
    if (phase !== "idle") return;
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    setMirror(next === "user");
    await startCamera(next);
  }

  const left = Math.max(0, maxDur - elapsed);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[9/16] max-h-[52vh] w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="hidden" />
        <audio ref={musicRef} preload="auto" className="hidden" />
        <canvas ref={canvasRef} className="h-full w-full object-contain" />
        {!started && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center">
            <p className="text-4xl">📷</p>
            <p className="text-sm text-muted">
              Kayıt için kameranı açmalısın. Video cihazından çıkmaz, önce
              önizlersin.
            </p>
            <button
              type="button"
              onClick={() => startCamera(facing)}
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white"
            >
              Kamerayı aç
            </button>
          </div>
        )}
        {phase === "countdown" && (
          <span className="absolute inset-0 grid place-items-center text-7xl font-black text-white drop-shadow-2xl">
            {count}
          </span>
        )}
        {phase === "recording" && (
          <span className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm font-bold tabular-nums text-white backdrop-blur">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            0:{String(left).padStart(2, "0")}
            {song && <span className="max-w-28 truncate text-[11px] font-medium text-amber-300">🎵 {song.name}</span>}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      {/* Efekt şeridi */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.css)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === f.css ? "bg-white text-black" : "bg-white/10 text-muted hover:text-white"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex gap-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setMaxDur(d)}
              disabled={phase !== "idle"}
              className={`rounded-full px-3 py-1.5 font-bold ${maxDur === d ? "bg-white/15 text-white" : "text-muted"} disabled:opacity-50`}
            >
              {d} sn
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={flip}
          disabled={phase !== "idle" || !started}
          className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-white disabled:opacity-50"
        >
          🔄 Çevir
        </button>
        <button
          type="button"
          onClick={() => setMirror((m) => !m)}
          className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-white"
        >
          {mirror ? "🪞 Aynalı" : "🪞 Düz"}
        </button>
        <button
          type="button"
          onClick={() => setCountdownOn((c) => !c)}
          className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-white"
        >
          {countdownOn ? "⏱ 3 sn" : "⏱ Kapalı"}
        </button>
      </div>

      {started && phase === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="rounded-full bg-red-600 py-3 font-extrabold text-white"
        >
          ● Kayda başla
        </button>
      )}
      {phase === "recording" && (
        <button
          type="button"
          onClick={stopRecording}
          className="rounded-full bg-white py-3 font-extrabold text-black"
        >
          ■ Durdur
        </button>
      )}
      {phase === "countdown" && (
        <p className="py-3 text-center text-sm text-muted">Hazırlan...</p>
      )}
    </div>
  );
}
