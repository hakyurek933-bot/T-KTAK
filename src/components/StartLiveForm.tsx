"use client";

import { useActionState, useState } from "react";
import { startLiveAction, type LiveState } from "@/actions/live";
import { LIVE_CATEGORIES } from "@/lib/live-meta";

export function StartLiveForm({
  videos,
}: {
  videos: { id: string; videoUrl: string; caption: string | null }[];
}) {
  const [state, action, pending] = useActionState<LiveState, FormData>(
    startLiveAction,
    null
  );
  const [mode, setMode] = useState<"mine" | "link">("mine");
  const [link, setLink] = useState("");

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-panel p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Canlı yayın aç
      </h2>
      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Yayın başlığı</span>
        <input
          name="title"
          maxLength={80}
          placeholder="örn. Akşam sohbeti"
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Kategori</span>
        <select
          name="category"
          defaultValue="sohbet"
          className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
        >
          {LIVE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex rounded-xl border border-white/10 bg-panel-2 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("mine")}
          className={`flex-1 rounded-lg py-2 font-medium ${
            mode === "mine" ? "bg-white/10 text-white" : "text-muted"
          }`}
        >
          Videolarımdan
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 rounded-lg py-2 font-medium ${
            mode === "link" ? "bg-white/10 text-white" : "text-muted"
          }`}
        >
          Bağlantı ile
        </button>
      </div>

      {mode === "mine" ? (
        videos.length === 0 ? (
          <p className="text-sm text-muted">
            Henüz videon yok. Önce video yükle ya da bağlantı ile devam et.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {videos.map((v, i) => (
              <label key={v.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="videoUrl"
                  value={v.videoUrl}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="block aspect-[9/16] overflow-hidden rounded-lg bg-panel-2 ring-2 ring-transparent peer-checked:ring-brand">
                  <video
                    src={v.videoUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </span>
              </label>
            ))}
          </div>
        )
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Video bağlantısı</span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://ornek.com/video.mp4"
            className="rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 outline-none focus:border-brand"
          />
          <input type="hidden" name="videoUrl" value={link} />
        </label>
      )}

      <p className="text-xs text-muted">
        Yayın açmak için 15 yaşından büyük olmalı ve doğum tarihin profilde kayıtlı
        olmalı.
      </p>

      <button
        disabled={pending}
        className="rounded-xl bg-red-600 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Açılıyor..." : "🔴 Yayını başlat"}
      </button>
    </form>
  );
}
