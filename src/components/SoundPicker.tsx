"use client";

import { useRef, useState } from "react";
import { searchSongsAction, type SongItem } from "@/actions/sounds";

export type PickedSong = {
  name: string;
  url: string;
  artwork: string;
} | null;

/** İnternetten şarkı bul: ara, dinle, seç. */
export function SoundPicker({
  value,
  onPick,
}: {
  value: PickedSong;
  onPick: (s: PickedSong) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SongItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2 || searching) return;
    setSearching(true);
    setNote(null);
    const res = await searchSongsAction(q.trim());
    if (res.error) {
      setNote(res.error);
      setItems([]);
    } else {
      setItems(res.items ?? []);
      if ((res.items ?? []).length === 0) setNote("Sonuç bulunamadı.");
    }
    setSearching(false);
  }

  function togglePreview(item: SongItem) {
    const el = audioRef.current;
    if (!el) return;
    if (playingId === item.id) {
      el.pause();
      setPlayingId(null);
      return;
    }
    el.src = item.previewUrl;
    el.play().catch(() => {});
    setPlayingId(item.id);
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-brand/30 bg-brand/10 p-2.5">
          {value.artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.artwork} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-lg">
              🎵
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{value.name}</span>
            <span className="text-[11px] text-muted">Seçili ses</span>
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted hover:text-white"
          >
            Kaldır
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSearch} className="flex gap-1.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Şarkı ara... (örn. Tarkan)"
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-panel-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {searching ? "..." : "Ara"}
            </button>
          </form>
          {note && <p className="text-xs text-muted">{note}</p>}
          {items.length > 0 && (
            <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-xl border border-white/10 bg-panel-2 p-1.5">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5"
                  onClick={() =>
                    onPick({ name: `${s.artist} - ${s.title}`, url: s.previewUrl, artwork: s.artwork })
                  }
                >
                  {s.artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.artwork} alt="" loading="lazy" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
                      🎵
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.title}</span>
                    <span className="block truncate text-xs text-muted">{s.artist}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(s);
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/15"
                    title="Önizlemeyi dinle"
                  >
                    {playingId === s.id ? "⏸" : "▶"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <audio
            ref={audioRef}
            onEnded={() => setPlayingId(null)}
            onPause={() => setPlayingId(null)}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
