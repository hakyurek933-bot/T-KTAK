"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { startLiveAction, type LiveState } from "@/actions/live";
import { LIVE_CATEGORIES, LIVE_MIN_FOLLOWERS } from "@/lib/live-meta";

/** TikTok tarzı sade yayın açma: başlık + kategori + tek buton.
 *  Fon videosu otomatik son videondur; değiştirmek istersen açarsın. */
export function StartLiveForm({
  videos,
  birthdateOk,
  age,
  livekitOn,
  followers,
  canBypass,
}: {
  videos: { id: string; videoUrl: string | null; caption: string | null }[];
  birthdateOk: boolean;
  age: number | null;
  livekitOn: boolean;
  followers: number;
  canBypass: boolean;
}) {
  const [state, action, pending] = useActionState<LiveState, FormData>(
    startLiveAction,
    null
  );
  const [category, setCategory] = useState("sohbet");
  const [source, setSource] = useState<"camera" | "video">(
    livekitOn ? "camera" : "video"
  );
  const [changeSource, setChangeSource] = useState(false);
  const [mode, setMode] = useState<"mine" | "link">("mine");
  const [link, setLink] = useState("");

  const defaultVideo = videos[0]?.videoUrl ?? "";
  const ageOk = birthdateOk && age !== null && age >= 15;
  const fansOk = canBypass || followers >= LIVE_MIN_FOLLOWERS;
  const canStart = ageOk && fansOk;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
      {/* Başlık: TikTok'taki gibi üstte */}
      <div className="border-b border-white/10 p-4 text-center">
        <p className="text-xs text-muted">Yayın başlığı</p>
      </div>

      <form action={action} className="flex flex-col gap-4 p-4">
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <label className="flex items-center justify-center gap-2 text-center">
          <input
            name="title"
            maxLength={80}
            placeholder="Bir başlık ekle ✎"
            className="w-full bg-transparent text-center text-lg font-bold outline-none placeholder:text-muted"
          />
        </label>

        {/* Kategori şeridi */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {LIVE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                category === c.key
                  ? "bg-white text-black"
                  : "bg-white/10 text-muted hover:text-white"
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />

        {/* Kaynak: kamera veya video fonu */}
        <div className="flex gap-1.5 rounded-xl border border-white/10 bg-panel-2 p-1 text-sm">
          <button
            type="button"
            onClick={() => setSource("camera")}
            className={`flex-1 rounded-lg py-2 font-bold ${source === "camera" ? "bg-white/10 text-white" : "text-muted"}`}
          >
            📷 Kamera
          </button>
          <button
            type="button"
            onClick={() => setSource("video")}
            className={`flex-1 rounded-lg py-2 font-bold ${source === "video" ? "bg-white/10 text-white" : "text-muted"}`}
          >
            🎬 Video fonu
          </button>
        </div>

        {source === "camera" ? (
          <div className="rounded-xl border border-white/10 bg-panel-2 p-3 text-center">
            {livekitOn ? (
              <p className="text-xs text-muted">
                📷 Yayın başlayınca kameran açılır, izleyiciler seni{" "}
                <span className="font-bold text-white">canlı</span> görür.
              </p>
            ) : (
              <p className="text-xs text-amber-300">
                Kamera için LiveKit anahtarları gerekli (Vercel env). Şimdilik
                video fonu seçebilirsin.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Fon videosu: otomatik son videon */}
        {defaultVideo && !changeSource ? (
          <button
            type="button"
            onClick={() => setChangeSource(true)}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-panel-2 p-2.5 text-left"
          >
            <video
              src={defaultVideo}
              muted
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-10 rounded-lg bg-black object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">Fon: son videon</span>
              <span className="text-[11px] text-muted">
                Değiştirmek için dokun
              </span>
            </span>
          </button>
        ) : videos.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-panel-2 p-2.5">
            <div className="mb-2 flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("mine")}
                className={`flex-1 rounded-lg py-1.5 font-bold ${mode === "mine" ? "bg-white/10 text-white" : "text-muted"}`}
              >
                Videolarımdan
              </button>
              <button
                type="button"
                onClick={() => setMode("link")}
                className={`flex-1 rounded-lg py-1.5 font-bold ${mode === "link" ? "bg-white/10 text-white" : "text-muted"}`}
              >
                Bağlantı ile
              </button>
            </div>
            {mode === "mine" ? (
              <div className="grid grid-cols-4 gap-1.5">
                {videos.slice(0, 8).map((v, i) => (
                  <label key={v.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="videoUrl"
                      value={v.videoUrl ?? ""}
                      defaultChecked={i === 0}
                      className="peer sr-only"
                    />
                    <span className="block aspect-[9/16] overflow-hidden rounded-lg bg-black ring-2 ring-transparent peer-checked:ring-brand">
                      <video
                        src={v.videoUrl ?? ""}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://ornek.com/video.mp4"
                  className="w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <input type="hidden" name="videoUrl" value={link} />
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-center text-xs text-muted">
              Videon yok — bir bağlantı yapıştır, yine de yayın açabilirsin.
            </p>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://ornek.com/video.mp4"
              className="w-full rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input type="hidden" name="videoUrl" value={link} />
          </>
        )}
        {defaultVideo && !changeSource && source === "video" && (
          <input type="hidden" name="videoUrl" value={defaultVideo} />
        )}
          </>

        )}

        {/* Şartlar */}
        {!ageOk ? (
          <Link
            href="/settings"
            className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-center text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30"
          >
            {!birthdateOk
              ? "Yayın açmak için önce doğum tarihini ekle →"
              : "Yayın açmak için 15 yaşından büyük olmalısın"}
          </Link>
        ) : !fansOk ? (
          <div className="rounded-xl bg-purple-500/10 px-3 py-2.5 text-center ring-1 ring-purple-500/30">
            <p className="text-xs font-bold text-purple-200">
              👥 {followers}/{LIVE_MIN_FOLLOWERS} takipçi
            </p>
            <div className="mx-auto mt-1.5 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all"
                style={{ width: `${Math.min(100, (followers / LIVE_MIN_FOLLOWERS) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Yayın açmak için {LIVE_MIN_FOLLOWERS} takipçiye ulaşmalısın
            </p>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted">
            ✓ {age} yaşındasın{canBypass ? "" : `, 👥 ${followers} takipçin var`} — yayın açabilirsin
          </p>
        )}

        <button
          disabled={
            pending ||
            !canStart ||
            (source === "video" && !defaultVideo && !link) ||
            (source === "camera" && !livekitOn)
          }
          className="rounded-full bg-red-600 py-3.5 text-base font-extrabold text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          {pending ? "Açılıyor..." : "🔴 CANLI Yayın Yap"}
        </button>
      </form>
    </div>
  );
}
