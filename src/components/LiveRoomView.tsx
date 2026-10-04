"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { LiveLikeButton } from "@/components/LiveLikeButton";
import { LiveGiftBar } from "@/components/LiveGiftBar";
import { DailyBonusButton } from "@/components/DailyBonusButton";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { Caption } from "@/components/Caption";
import { PkInvite } from "@/components/PkInvite";
import { LIVE_CATEGORIES } from "@/lib/live-meta";
import type { LiveSnapshot } from "@/actions/live";
import type { Role } from "@prisma/client";

type RoomAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
};

export type EndedSummary = {
  duration: string;
  messages: number;
  likes: number;
  giftCoins: number;
  giftCount: number;
};

/** TikTok tarzı canlı oda.
 *  Mobil: tam boy video + yüzen sohbet + sağ aksiyon çubuğu.
 *  PC: video solda, sohbet+hediye sağ panelde. */
export function LiveRoomView({
  roomId,
  title,
  videoUrl,
  status,
  author,
  initial,
  balance,
  claimedToday,
  isAuthor,
  canModerate,
  currentUsername,
  startedAtISO,
  endedSummary,
  category,
  otherRooms,
}: {
  roomId: string;
  title: string;
  videoUrl: string;
  status: "LIVE" | "ENDED";
  author: RoomAuthor;
  initial: LiveSnapshot | null;
  balance: number;
  claimedToday: boolean;
  isAuthor: boolean;
  canModerate: boolean;
  currentUsername: string;
  startedAtISO: string;
  endedSummary: EndedSummary | null;
  category: string;
  otherRooms: { id: string; title: string; author: { username: string } }[];
}) {
  const [chatOpen, setChatOpen] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const live = status === "LIVE";
  const canDelete = isAuthor || canModerate;

  async function handleShare() {
    const url = `${window.location.origin}/live/${roomId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} — Taktik`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* iptal edildi */
    }
  }

  const chatProps = {
    roomId,
    isAuthor,
    canModerate,
    currentUsername,
    canDelete,
    initial: initial as LiveSnapshot,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row">
        {/* Video */}
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black md:max-h-[78vh] md:min-w-0 md:flex-1">
          <VideoPlayer src={videoUrl} />

          {/* Üst bilgi */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 bg-gradient-to-b from-black/80 to-transparent p-3 pb-6">
            <Avatar user={author} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white drop-shadow">{title}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <Link href={`/u/${author.username}`} className="hover:underline">
                  @{author.username}
                </Link>
                <RoleTag role={author.role} />
              </p>
            </div>
            {live ? (
              <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                CANLI{initial ? ` · ${initial.viewers}` : ""}
              </span>
            ) : (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                SONA ERDİ
              </span>
            )}
            <CategoryChip category={category} />
          </div>
          {live && (
            <div className="absolute left-3 top-16 z-20">
              <LiveTimer startedAtISO={startedAtISO} />
            </div>
          )}

          {/* Mobil sağ aksiyon çubuğu */}
          {live && initial && (
            <div className="absolute bottom-[46%] right-2 z-20 flex flex-col items-center gap-3 md:hidden">
              <LiveLikeButton roomId={roomId} initialLikes={initial.likes} />
              {isAuthor && <PkInvite myRoomId={roomId} rooms={otherRooms} />}
              <RailButton
                title="Hediye gönder"
                active={giftOpen}
                onClick={() => setGiftOpen((v) => !v)}
                activeClass="bg-amber-400 text-black ring-amber-300"
              >
                🎁
              </RailButton>
              <RailButton
                title="Sohbeti aç/kapat"
                active={chatOpen}
                onClick={() => setChatOpen((v) => !v)}
                activeClass="bg-white/20 text-white ring-white/30"
              >
                💬
              </RailButton>
              <RailButton title="Paylaş" onClick={handleShare}>
                {shared ? "✓" : "↗"}
              </RailButton>
            </div>
          )}

          {/* Mobil yüzen sohbet */}
          {chatOpen && (
            <div className="absolute inset-x-0 bottom-0 z-10 h-[44%] bg-gradient-to-t from-black via-black/75 to-transparent px-2 pb-2 pt-8 md:hidden">
              {initial ? (
                <LiveChat {...chatProps} compact />
              ) : (
                <p className="grid h-full place-items-center text-sm text-white/60">
                  Sohbet yüklenemedi.
                </p>
              )}
            </div>
          )}
        </div>

        {/* PC yan paneli */}
        <div className="hidden w-96 shrink-0 flex-col gap-3 md:flex md:max-h-[78vh]">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-panel px-3 py-2.5">
            {live && initial ? (
              <>
                <LiveLikeButton roomId={roomId} initialLikes={initial.likes} />
                {isAuthor && <PkInvite myRoomId={roomId} rooms={otherRooms} />}
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/15"
                >
                  {shared ? "Kopyalandı ✓" : "↗ Paylaş"}
                </button>
                <LiveTimer startedAtISO={startedAtISO} />
              </>
            ) : (
              <p className="text-sm text-muted">Yayın sona erdi.</p>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel">
            {initial ? (
              <LiveChat {...chatProps} compact />
            ) : (
              <p className="grid h-full place-items-center text-sm text-muted">
                Sohbet yüklenemedi.
              </p>
            )}
          </div>
          {live && (
            <>
              <DailyBonusButton claimedToday={claimedToday} balance={balance} />
              <LiveGiftBar roomId={roomId} balance={initial?.balance ?? balance} />
            </>
          )}
        </div>
      </div>

      {/* Bitiş özeti */}
      {!live && endedSummary && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Süre", value: endedSummary.duration },
            { label: "Mesaj", value: String(endedSummary.messages) },
            { label: "Beğeni", value: String(endedSummary.likes) },
            { label: "Hediye", value: `🪙${endedSummary.giftCoins}` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-panel p-3 text-center"
            >
              <p className="text-base font-extrabold">{s.value}</p>
              <p className="text-[11px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-1">
        <Caption text={title} className="text-sm text-white/90" />
      </div>

      {/* Mobil alt panel */}
      {live && (
        <div className="flex flex-col gap-3 md:hidden">
          <DailyBonusButton claimedToday={claimedToday} balance={balance} />
          {giftOpen && (
            <LiveGiftBar roomId={roomId} balance={initial?.balance ?? balance} />
          )}
        </div>
      )}
    </div>
  );
}

function RailButton({
  title,
  active = false,
  onClick,
  activeClass = "",
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  activeClass?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-12 w-12 place-items-center rounded-full text-2xl ring-1 backdrop-blur-md transition active:scale-90 ${
        active ? activeClass : "bg-white/10 text-white ring-white/20"
      }`}
    >
      {children}
    </button>
  );
}

/** Kategori rozeti. */
function CategoryChip({ category }: { category: string }) {
  const meta = LIVE_CATEGORIES.find((c) => c.key === category);
  if (!meta) return null;
  return (
    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
      {meta.emoji} {meta.name}
    </span>
  );
}

/** Yayın süresi sayacı (ss:dd / dd:ss). */
function LiveTimer({ startedAtISO }: { startedAtISO: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(startedAtISO).getTime()) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const str =
    hh > 0
      ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : `${mm}:${String(ss).padStart(2, "0")}`;
  return (
    <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
      ⏱ {str}
    </span>
  );
}
