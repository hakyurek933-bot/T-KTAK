"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Avatar } from "@/components/Avatar";

/** Profil fotoğrafı yükleyici: önizleme + Blob'a yükleme + kaldırma. */
export function AvatarUpload({
  username,
  displayName,
  initialUrl,
}: {
  username: string;
  displayName: string;
  initialUrl: string;
}) {
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
        `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`,
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
    <div className="flex items-center gap-4">
      <Avatar
        user={{ username, displayName, avatarUrl: url || null }}
        size={72}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
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
        <input type="hidden" name="avatarUrl" value={url} readOnly />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
          >
            {uploading ? "Yükleniyor..." : url ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
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
        <p className="text-xs text-muted">JPG, PNG, WebP veya GIF — en fazla 5 MB.</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
