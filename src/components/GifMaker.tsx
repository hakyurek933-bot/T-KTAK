"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createPostAction } from "@/actions/posts";

const FPS = 10;
const SECS = 2;
const WIDTH = 320;

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("seek-timeout")), 8000);
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  });
}

/** Videodan 2 saniyelik GIF üretir (telefonda çalışır, sunucuya dokunmaz). */
export function GifMaker({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxStart = Math.max(0, duration - SECS);

  async function handleMake() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || working) return;
    if (!video.videoWidth) {
      setError("Video henüz yüklenmedi, biraz bekle.");
      return;
    }
    setError(null);
    setWorking(true);
    setPreview(null);
    setGifFile(null);
    try {
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
      const frames = FPS * SECS;
      const scale = WIDTH / video.videoWidth;
      const w = WIDTH;
      const h = Math.max(2, Math.round(video.videoHeight * scale));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas-yok");

      const gif = GIFEncoder();
      for (let i = 0; i < frames; i++) {
        const t = Math.min(start + i / FPS, Math.max(0, video.duration - 0.05));
        await seekTo(video, t);
        ctx.drawImage(video, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, w, h, { palette, delay: Math.round(1000 / FPS) });
        setStatus(`Kareler alınıyor... ${i + 1}/${frames}`);
      }
      gif.finish();
      const bytes = gif.bytes();
      const file = new File([bytes as BlobPart], `taktik-${Date.now()}.gif`, {
        type: "image/gif",
      });
      setGifFile(file);
      setPreview(URL.createObjectURL(file));
      setStatus(null);
    } catch {
      setError(
        "GIF üretilemedi. Başka bir videoda dene (bazı kaynaklar izin vermez)."
      );
      setStatus(null);
    } finally {
      setWorking(false);
    }
  }

  async function handleShare() {
    if (!gifFile || sharing) return;
    setSharing(true);
    setError(null);
    setStatus("GIF yükleniyor...");
    try {
      const blob = await upload(
        `gifs/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.gif`,
        gifFile,
        {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/gif",
        }
      );
      const fd = new FormData();
      fd.set("videoUrl", blob.url);
      fd.set("mediaType", "image");
      fd.set("caption", caption.trim());
      await createPostAction(null, fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paylaşılamadı.");
      setSharing(false);
      setStatus(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Kaynak video (gizli değil: anı buradan seçersin) */}
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        className="max-h-72 w-full rounded-2xl bg-black"
        controls
      />
      <canvas ref={canvasRef} className="hidden" />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">
          GIF başlangıcı (2 saniyelik an):{" "}
          <span className="font-bold text-white">{start.toFixed(1)} sn</span>
        </span>
        <input
          type="range"
          min={0}
          max={maxStart}
          step={0.1}
          value={Math.min(start, maxStart)}
          onChange={(e) => setStart(Number(e.target.value))}
          className="w-full accent-red-500"
        />
      </label>

      <button
        type="button"
        onClick={handleMake}
        disabled={working || duration === 0}
        className="rounded-xl bg-brand py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {working ? (status ?? "Hazırlanıyor...") : "🎬 GIF oluştur"}
      </button>

      {preview && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-panel p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="GIF önizleme" className="max-h-64 rounded-xl" />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
            placeholder="Açıklama (örn. #kedi 😹)"
            className="w-full rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 py-2.5 font-bold text-black disabled:opacity-60"
          >
            {sharing ? (status ?? "Paylaşılıyor...") : "Paylaş"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
