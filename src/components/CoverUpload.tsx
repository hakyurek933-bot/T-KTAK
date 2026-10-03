"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

/** Kapak fotoğrafı yükleyici: geniş önizleme + Blob'a yükleme + kaldırma. */
export function CoverUpload({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        : "";
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
        ? ext
        : ".jpg";
      const blob = await upload(
        `covers/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`,
        file,
        {
          access: "public",
          handleUploadUrl: "/api/avatar",
          ...(file.type ? { contentType: file.type } : {}),
        }
      );
      setUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız oldu.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-24 w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand/40 via-brand-2/30 to-brand/40">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted">
            Kapak yok — degrade görünür
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {/* Ayarlar formu bu gizli alanı okur. */}
      <input type="hidden" name="coverUrl" value={url} readOnly />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
        >
          {uploading ? "Yükleniyor..." : url ? "Kapağı değiştir" : "Kapak yükle"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => {
              setUrl("");
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-muted hover:text-white"
          >
            Kaldır
          </button>
        )}
      </div>
      <p className="text-xs text-muted">Geniş fotoğraf önerilir (örn. 1200x400).</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
