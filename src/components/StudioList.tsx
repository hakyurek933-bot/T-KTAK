"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deletePostAction } from "@/actions/posts";
import { promotePostAction } from "@/actions/coins";
import { PROMOTE_COST } from "@/lib/coins";
import { probeUrlPlayable } from "@/lib/video-probe";
import { VideoThumb } from "@/components/VideoThumb";
import { formatCount, timeAgo, isActivePromo } from "@/lib/utils";

export type StudioPost = {
  id: string;
  videoUrl: string;
  caption: string | null;
  viewCount: number;
  promotedUntil: string | null;
  createdAt: string;
  likes: number;
  comments: number;
};

type Status = "check" | "ok" | "bad";

/** Videolarım listesi: sağlamlık rozeti + istatistik + tek tık silme. */
export function StudioList({ posts }: { posts: StudioPost[] }) {
  const [items, setItems] = useState(posts);
  const [promoBusy, setPromoBusy] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(posts.map((p) => [p.id, "check" as Status]))
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  // Videoları sırayla yokla (ağı yormamak için tek tek).
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const p of posts) {
        if (!alive) break;
        try {
          const ok = await probeUrlPlayable(p.videoUrl);
          if (alive) setStatus((s) => ({ ...s, [p.id]: ok ? "ok" : "bad" }));
        } catch {
          if (alive) setStatus((s) => ({ ...s, [p.id]: "bad" }));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [posts]);

  async function handleDelete(id: string) {
    if (!confirm("Bu video kalıcı olarak silinsin mi?")) return;
    setDeleting(id);
    try {
      await deletePostAction(id);
      setItems((list) => list.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteBad() {
    const ids = items
      .filter((p) => status[p.id] === "bad")
      .map((p) => p.id);
    if (ids.length === 0) return;
    if (
      !confirm(
        `${ids.length} oynatılamayan video kalıcı olarak silinsin mi?`
      )
    )
      return;
    for (const id of ids) {
      setDeleting(id);
      try {
        await deletePostAction(id);
        setItems((list) => list.filter((p) => p.id !== id));
      } catch {
        /* tekil hata toplu silmeyi durdurmasın */
      }
    }
    setDeleting(null);
  }

  const badCount = items.filter((p) => status[p.id] === "bad").length;

  async function handlePromote(id: string) {
    if (
      !confirm(
        `Bu video 24 saat Keşfet'te öne çıksın mı? (${PROMOTE_COST}🪙)`
      )
    )
      return;
    setPromoBusy(id);
    setPromoMsg(null);
    try {
      const res = await promotePostAction(id);
      if (res.error) {
        setPromoMsg(res.error);
      } else {
        setPromoMsg("Video öne çıkarıldı! ⚡");
        setItems((list) =>
          list.map((p) =>
            p.id === id ? { ...p, promotedUntil: res.until ?? null } : p
          )
        );
      }
    } finally {
      setPromoBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted">
        <p className="font-semibold text-white">Henüz videon yok</p>
        <Link
          href="/upload"
          className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
        >
          İlk videonu yükle
        </Link>
      </div>
    );
  }

  return (
    <>
      {badCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-2.5">
          <p className="text-xs text-muted">
            {badCount} video oynatılamıyor
          </p>
          <button
            type="button"
            onClick={handleDeleteBad}
            disabled={deleting !== null}
            className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {deleting !== null ? "Siliniyor..." : `🗑 Bozukları toplu sil (${badCount})`}
          </button>
        </div>
      )}
      {promoMsg && (
        <p className="mb-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-2 text-xs text-amber-200">
          {promoMsg}
        </p>
      )}
      <ul className="flex flex-col gap-3">
      {items.map((p) => {
        const st = status[p.id] ?? "check";
        return (
          <li
            key={p.id}
            className="flex gap-3 rounded-2xl border border-white/10 bg-panel p-3"
          >
            <div className="aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-xl bg-black">
              <VideoThumb src={p.videoUrl} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {p.caption || "Başlıksız video"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {timeAgo(p.createdAt)} · 👁 {formatCount(p.viewCount)} · ❤️{" "}
                {formatCount(p.likes)} · 💬 {formatCount(p.comments)}
              </p>
              <div className="mt-1.5">
                {st === "check" && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-muted">
                    Kontrol ediliyor...
                  </span>
                )}
                {st === "ok" && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    ✓ Oynatılıyor
                  </span>
                )}
                {st === "bad" && (
                  <span
                    className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400"
                    title="Bu video tarayıcıda açılmıyor. Silip MP4 (H.264) olarak tekrar yükle."
                  >
                    ⚠️ Oynatılamıyor — silip tekrar yükle
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <Link
                href={`/?v=${p.id}`}
                className="rounded-full border border-white/15 px-3 py-1 text-center text-xs font-semibold hover:border-white/40"
              >
                Aç
              </Link>
              {isActivePromo(p.promotedUntil) ? (
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-center text-xs font-bold text-amber-300">
                  ⚡ Öne çıkıyor
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePromote(p.id)}
                  disabled={promoBusy !== null || deleting !== null}
                  title={`24 saat Keşfet'te üstte (${PROMOTE_COST} coin)`}
                  className="rounded-full border border-amber-400/40 px-3 py-1 text-center text-xs font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
                >
                  {promoBusy === p.id ? "..." : `⚡ ${PROMOTE_COST}🪙`}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                disabled={deleting === p.id}
                className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
              >
                {deleting === p.id ? "..." : "Sil"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}
