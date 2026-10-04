"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createPostAction, type PostState } from "@/actions/posts";
import { MAX_VIDEO_BYTES, MAX_IMAGE_BYTES, probeFilePlayable } from "@/lib/video-probe";
import { VideoRecorder } from "@/components/VideoRecorder";

export function UploadForm({
  duetOf = null,
}: {
  duetOf?: { id: string; videoUrl: string; author: { username: string } } | null;
}) {
  const [state, action, pending] = useActionState<PostState, FormData>(
    createPostAction,
    null
  );

  const [tab, setTab] = useState<"file" | "link" | "record">("file");
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [sounds, setSounds] = useState<{ name: string; count: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Trend sesleri bir kez çek (ses alanında öneri).
  useEffect(() => {
    fetch("/api/sounds")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.sounds)) setSounds(d.sounds.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  async function handleFile(file: File) {
    setUploadError(null);
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setUploadError("Yalnızca video veya fotoğraf seçebilirsin.");
      return;
    }
    if (duetOf && isImage) {
      setUploadError("Düet tepkisi video olmalı. Bir video seç.");
      return;
    }
    const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    const mb = (file.size / 1024 / 1024).toFixed(1);
    setFileInfo(`${file.name} (${mb} MB)`);
    if (file.size > limit) {
      setUploadError(
        isImage
          ? `Fotoğraf çok büyük (${mb} MB). En fazla 10 MB olabilir.`
          : `Video çok büyük (${mb} MB). En fazla 50 MB yükleyebilirsin — daha kısa bir video dene.`
      );
      return;
    }
    setUploading(true);
    setChecking(true);
    setProgress(0);
    try {
      if (isVideo) {
        const playable = await probeFilePlayable(file);
        setChecking(false);
        if (!playable) {
          setUploadError(
            "Bu video bu tarayıcıda oynatılamıyor (örn. iPhone 'Verimli' modunda çekilmiş olabilir). iPhone'da Ayarlar → Kamera → Formatlar → 'En Uyumlu'yu seçip tekrar çek, ya da videoyu MP4 (H.264) olarak kaydet."
          );
          setUploading(false);
          return;
        }
      } else {
        setChecking(false);
      }
      const pathname = createBlobPathname(file);
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        ...(file.type ? { contentType: file.type } : {}),
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });
      setVideoUrl(blob.url);
      setMediaType(isImage ? "image" : "video");
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
                : file.type === "image/jpeg"
                  ? ".jpg"
                  : file.type === "image/png"
                    ? ".png"
                    : file.type === "image/webp"
                      ? ".webp"
                      : file.type === "image/gif"
                        ? ".gif"
                        : "";
    const fallback = file.type.startsWith("image/") ? ".jpg" : ".mp4";
    const ext = (nameExt || typeExt || fallback).replace(/[^a-z0-9.]/g, "").slice(0, 5);
    const random = Math.random().toString(36).slice(2, 10);
    return `videos/${Date.now()}-${random}${ext.startsWith(".") ? ext : `.${ext}`}`;
  }

  return (
    <div className="flex flex-col gap-5">
      {duetOf && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-3">
          <video
            src={duetOf.videoUrl}
            muted
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-14 rounded-lg bg-black object-cover"
          />
          <p className="text-xs text-muted">
            🎭 <span className="font-semibold text-white">@{duetOf.author.username}</span>{" "}
            videosuna düet çekiyorsun. Yayınlandığında yan yana oynar.
          </p>
        </div>
      )}
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
        {!duetOf && (
          <button
            type="button"
            onClick={() => setTab("record")}
            className={`flex-1 rounded-lg py-2 font-medium ${
              tab === "record" ? "bg-white/10 text-white" : "text-muted"
            }`}
          >
            📷 Kaydet
          </button>
        )}
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

      {tab === "record" ? (
        <VideoRecorder
          onDone={(file) => {
            setTab("file");
            handleFile(file);
          }}
        />
      ) : tab === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !uploading) handleFile(f);
          }}
          className={`rounded-2xl border border-dashed p-6 text-center transition ${
            dragOver ? "border-brand bg-brand/10" : "border-white/15"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept={duetOf ? "video/*" : "video/*,image/*"}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {videoUrl ? (
            <div className="flex flex-col items-center gap-2">
              {mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={videoUrl} alt="" className="max-h-64 rounded-xl" />
              ) : (
                <video src={videoUrl} controls className="max-h-64 rounded-xl" />
              )}
              <button
                type="button"
                onClick={() => {
                  setVideoUrl("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs text-muted hover:text-white"
              >
                Başka dosya seç
              </button>
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-3">
              {fileInfo && (
                <p className="max-w-xs truncate text-xs text-muted">{fileInfo}</p>
              )}
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
              <p className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl">
                🎬
              </p>
              <p className="mt-2 text-sm text-muted">
                Video veya fotoğraf seç, ya da buraya sürükle
              </p>
              <p className="text-xs text-muted">
                Video: mp4 / 3gp / webm (50 MB) · Fotoğraf/GIF: jpg / png / gif (10 MB)
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
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Medya bağlantısı (URL)</span>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://ornek.com/video.mp4"
              className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
            />
          </label>
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
        </>
      )}

      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
            {state.error}
          </p>
        )}
        <input type="hidden" name="videoUrl" value={videoUrl} />
        <input type="hidden" name="mediaType" value={mediaType} />
        {duetOf && <input type="hidden" name="duetOfId" value={duetOf.id} />}
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
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">🎵 Ses (opsiyonel)</span>
          <input
            name="sound"
            maxLength={60}
            placeholder="Bu videodaki sesin adı..."
            list="taktik-sounds"
            autoComplete="off"
            className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
          />
          <datalist id="taktik-sounds">
            {sounds.map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
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
