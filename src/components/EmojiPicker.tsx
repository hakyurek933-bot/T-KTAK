"use client";

import { useState } from "react";
import { EMOJI_CATEGORIES, STICKERS } from "@/lib/emoji";
import { searchGifsAction } from "@/actions/gifs";

type Tab = "emoji" | "sticker" | "gif";

/** Mesajlaşma eklenti paneli: emoji ızgarası + çıkartmalar + GIF arama. */
export function EmojiPicker({
  onEmoji,
  onSticker,
  onGif,
  tabs = ["emoji", "sticker", "gif"],
}: {
  onEmoji: (e: string) => void;
  onSticker: (e: string) => void;
  onGif: (url: string) => void;
  tabs?: Tab[];
}) {
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [cat, setCat] = useState(0);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<{ url: string; preview: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [gifNote, setGifNote] = useState<string | null>(null);

  async function handleGifSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setGifNote(null);
    const res = await searchGifsAction(query.trim());
    if (res.needsKey) {
      setGifNote("GIF servisi henüz bağlanmadı. Yakında! 🎬");
      setGifs([]);
    } else if (res.error) {
      setGifNote(res.error);
      setGifs([]);
    } else {
      setGifs(res.items ?? []);
      if ((res.items ?? []).length === 0) setGifNote("Sonuç bulunamadı.");
    }
    setSearching(false);
  }

  const TITLES: Record<Tab, string> = {
    emoji: "😀",
    sticker: "🎭",
    gif: "GIF",
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-panel-2 p-2.5">
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${
              tab === t ? "bg-white/10 text-white" : "text-muted hover:text-white"
            }`}
          >
            {TITLES[t]}
          </button>
        ))}
      </div>

      {tab === "emoji" && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {EMOJI_CATEGORIES.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCat(i)}
                title={c.name}
                className={`shrink-0 rounded-lg px-2 py-1 text-lg ${
                  cat === i ? "bg-white/10" : "opacity-60 hover:opacity-100"
                }`}
              >
                {c.emojis[0]}
              </button>
            ))}
          </div>
          <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto">
            {EMOJI_CATEGORIES[cat].emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onEmoji(e)}
                className="rounded-lg py-1 text-center text-2xl transition hover:bg-white/10 active:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "sticker" && (
        <div className="grid max-h-44 grid-cols-5 gap-1 overflow-y-auto">
          {STICKERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSticker(s)}
              title="Gönder"
              className="rounded-xl bg-white/5 py-2 text-center text-4xl transition hover:bg-white/10 active:scale-110"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {tab === "gif" && (
        <>
          <form onSubmit={handleGifSearch} className="flex gap-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="GIF ara... (örn. kedi)"
              maxLength={50}
              className="w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {searching ? "..." : "Ara"}
            </button>
          </form>
          {gifNote && <p className="text-center text-xs text-muted">{gifNote}</p>}
          {gifs.length > 0 && (
            <div className="grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto">
              {gifs.map((g) => (
                <button
                  key={g.url}
                  type="button"
                  onClick={() => onGif(g.url)}
                  className="overflow-hidden rounded-xl transition hover:ring-2 hover:ring-brand active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.preview || g.url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
