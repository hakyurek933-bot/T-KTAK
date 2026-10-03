"use client";

import { useActionState, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createPostAction, type PostState } from "@/actions/posts";
import { MAX_VIDEO_BYTES, probeFilePlayable } from "@/lib/video-probe";

export function UploadForm() {
  const [state, action, pending] = useActionState<PostState, FormData>(
    createPostAction,
    null
  );

  const [tab, setTab] = useState<"file" | "link">("file");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    if (file.size > MAX_VIDEO_BYTES) {
      setUploadError(
        `Video çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla 50 MB yükleyebilirsin — daha kısa bir video dene.`
      );
      return;
    }
    setUploading(true);
    setChecking(true);
    setProgress(0);
    try {
      const playable = await probeFilePlayable(file);
      setChecking(false);
      if (!playable) {
        setUploadError(
          "Bu video bu tarayıcıda oynatılamıyor (örn. iPhone 'Verimli' modunda çekilmiş olabilir). iPhone'da Ayarlar → Kamera → Formatlar → 'En Uyumlu'yu seçip tekrar çek, ya da videoyu MP4 (H.264) olarak kaydet."
        );
        setUploading(false);
        return;
      }
      const pathname = createBlobPathname(file);
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        ...(file.type ? { contentType: file.type } : {}),
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });
      setVideoUrl(blob.url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Yükleme başarısız oldu."
      );
    } finally {
      setUploading(false);
    }
  }

  function createBlobPathname(file: File) {
    const fromName = (file.name.split(/[\\/]/).pop() || "").toLowerCase();
    const nameExt = fromName.includes(".")
      ? fromName.slice(fromName.lastIndexOf("."))
      : "";
    const typeExt =
      file.type === "video/mp4"
        ? ".mp4"
        : file.type === "video/webm"
          ? ".webm"
          : file.type === "video/quicktime"
            ? ".mov"
            : file.type === "video/ogg"
              ? ".ogv"
              : file.type === "video/3gpp" || file.type === "video/3gpp2"
                ? ".3gp"
                : "";
    const ext = (nameExt || typeExt || ".mp4").replace(/[^a-z0-9.]/g, "").slice(0, 5);
    const random = Math.random().toString(36).slice(2, 10);
    return `videos/${Date.now()}-${random}${ext.startsWith(".") ? ext : `.${ext}`}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-xl border border-white/10 bg-panel-2 p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex-1 rounded-lg py-2 font-medium ${
            tab === "file" ? "bg-white/10 text-white" : "text-muted"
          }`}
        >
          Cihazdan yükle
        </button>
        <button
          type="button"
          onClick={() => setTab("link")}
          className={`flex-1 rounded-lg py-2 font-medium ${
            tab === "link" ? "bg-white/10 text-white" : "text-muted"
          }`}
        >
          Link ile ekle
        </button>
      </div>

      {tab === "file" ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {videoUrl ? (
            <div className="flex flex-col items-center gap-2">
              <video src={videoUrl} controls className="max-h-64 rounded-xl" />
              <button
                type="button"
                onClick={() => {
                  setVideoUrl("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs text-muted hover:text-white"
              >
                Başka video seç
              </button>
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-3">
              {checking ? (
                <p className="text-sm text-muted">Video kontrol ediliyor...</p>
              ) : (
                <>
                  <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted">Yükleniyor... %{progress}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">
                Video dosyanı seç (mp4 / 3gp / webm, en fazla 50 MB)
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
          {uploadError && <p className="mt-3 text-xs text-red-400">{uploadError}</p>}
        </div>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Video bağlantısı (URL)</span>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://ornek.com/video.mp4"
            className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
      )}

      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
            {state.error}
          </p>
        )}
        <input type="hidden" name="videoUrl" value={videoUrl} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Açıklama (opsiyonel)</span>
          <textarea
            name="caption"
            maxLength={300}
            rows={3}
            placeholder="Video açıklaması, hashtag'ler..."
            className="resize-none rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
        <button
          disabled={pending || !videoUrl}
          className="rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
        >
          {pending ? "Paylaşılıyor..." : "Paylaş"}
        </button>
      </form>
    </div>
  );
}
