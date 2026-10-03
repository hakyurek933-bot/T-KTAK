"use client";

import { useActionState, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createStoryAction, type StoryState } from "@/actions/stories";
import { MAX_VIDEO_BYTES, probeFilePlayable } from "@/lib/video-probe";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Hikaye oluşturma formu: video (50 MB) veya fotoğraf (5 MB), 24 saat yayında. */
export function StoryCreateForm() {
  const [state, action, pending] = useActionState<StoryState, FormData>(
    createStoryAction,
    null
  );
  const [tab, setTab] = useState<"file" | "link">("file");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Yalnızca video veya fotoğraf seçebilirsin.");
      return;
    }
    const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > limit) {
      setError(
        isImage
          ? "Fotoğraf en fazla 5 MB olabilir."
          : `Video çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla 50 MB.`
      );
      return;
    }
    setWorking(true);
    try {
      if (isVideo) {
        setStatus("Video kontrol ediliyor...");
        const playable = await probeFilePlayable(file);
        if (!playable) {
          setError("Bu video bu tarayıcıda oynatılamıyor. MP4 (H.264) dene.");
          setStatus(null);
          setWorking(false);
          return;
        }
      }
      setStatus("Yükleniyor...");
      const blob = await upload(
        `stories/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        file,
        {
          access: "public",
          // Fotoğraflar avatar ucuna, videolar video ucuna gider.
          handleUploadUrl: isImage ? "/api/avatar" : "/api/upload",
          ...(file.type ? { contentType: file.type } : {}),
        }
      );
      setMediaUrl(blob.url);
      setMediaType(isImage ? "image" : "video");
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız oldu.");
      setStatus(null);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {tab === "file" ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept="video/*,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {mediaUrl ? (
            <div className="flex flex-col items-center gap-2">
              {mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="max-h-64 rounded-xl" />
              ) : (
                <video src={mediaUrl} controls className="max-h-64 rounded-xl" />
              )}
              <button
                type="button"
                onClick={() => {
                  setMediaUrl("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs text-muted hover:text-white"
              >
                Başka dosya seç
              </button>
            </div>
          ) : working ? (
            <p className="text-sm text-muted">{status ?? "Hazırlanıyor..."}</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Video (50 MB) veya fotoğraf (5 MB) seç — 24 saat yayında kalır
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
              >
                Dosya seç
              </button>
            </>
          )}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Medya bağlantısı (URL)</span>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://ornek.com/foto.jpg"
            className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
      )}

      <div className="flex rounded-xl border border-white/10 bg-panel-2 p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex-1 rounded-lg py-2 font-medium ${tab === "file" ? "bg-white/10 text-white" : "text-muted"}`}
        >
          Cihazdan yükle
        </button>
        <button
          type="button"
          onClick={() => setTab("link")}
          className={`flex-1 rounded-lg py-2 font-medium ${tab === "link" ? "bg-white/10 text-white" : "text-muted"}`}
        >
          Link ile ekle
        </button>
      </div>

      {tab === "link" && (
        <div className="flex gap-2 text-sm">
          {(["video", "image"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMediaType(t)}
              className={`flex-1 rounded-xl border py-2 font-medium ${mediaType === t ? "border-brand bg-brand/15 text-white" : "border-white/10 text-muted"}`}
            >
              {t === "video" ? "🎬 Video" : "🖼️ Fotoğraf"}
            </button>
          ))}
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
            {state.error}
          </p>
        )}
        <input type="hidden" name="mediaUrl" value={mediaUrl} />
        <input type="hidden" name="mediaType" value={mediaType} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Açıklama (opsiyonel, 140 karakter)</span>
          <input
            name="caption"
            maxLength={140}
            placeholder="Hikayene bir not ekle..."
            className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
        <button
          disabled={pending || !mediaUrl}
          className="rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
        >
          {pending ? "Paylaşılıyor..." : "Hikayeyi paylaş"}
        </button>
      </form>
    </div>
  );
}
