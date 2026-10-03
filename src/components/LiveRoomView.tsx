"use client";

import { useState } from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { LiveLikeButton } from "@/components/LiveLikeButton";
import { LiveGiftBar } from "@/components/LiveGiftBar";
import { DailyBonusButton } from "@/components/DailyBonusButton";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { Caption } from "@/components/Caption";
import type { LiveSnapshot } from "@/actions/live";
import type { Role } from "@prisma/client";

type RoomAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
};

/** TikTok tarzı canlı oda: tam boy video, üstte yayıncı, sağda aksiyon
 *  çubuğu, altta yüzen sohbet, hediye paneli. */
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
}) {
  const [chatOpen, setChatOpen] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const live = status === "LIVE";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black sm:max-h-[78vh]">
        <VideoPlayer src={videoUrl} />

        {/* Üst bilgi: yayıncı + başlık + rozet */}
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
        </div>

        {/* Sağ aksiyon çubuğu */}
        {live && initial && (
          <div className="absolute bottom-[46%] right-2 z-20 flex flex-col items-center gap-3">
            <LiveLikeButton roomId={roomId} initialLikes={initial.likes} />
            <button
              type="button"
              onClick={() => setGiftOpen((v) => !v)}
              title="Hediye gönder"
              className={`grid h-12 w-12 place-items-center rounded-full text-2xl ring-1 backdrop-blur-md transition active:scale-90 ${
                giftOpen
                  ? "bg-amber-400 text-black ring-amber-300"
                  : "bg-white/10 text-white ring-white/20"
              }`}
            >
              🎁
            </button>
            <button
              type="button"
              onClick={() => setChatOpen((v) => !v)}
              title="Sohbeti aç/kapat"
              className={`grid h-12 w-12 place-items-center rounded-full text-2xl ring-1 backdrop-blur-md transition active:scale-90 ${
                chatOpen
                  ? "bg-white/20 text-white ring-white/30"
                  : "bg-white/10 text-white/60 ring-white/20"
              }`}
            >
              💬
            </button>
          </div>
        )}

        {/* Altta yüzen sohbet */}
        {chatOpen && (
          <div className="absolute inset-x-0 bottom-0 z-10 h-[44%] bg-gradient-to-t from-black via-black/75 to-transparent px-2 pb-2 pt-8">
            {initial ? (
              <LiveChat
                roomId={roomId}
                isAuthor={isAuthor}
                canModerate={canModerate}
                initial={initial}
                compact
              />
            ) : (
              <p className="grid h-full place-items-center text-sm text-white/60">
                Sohbet yüklenemedi.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-1">
        <Caption text={title} className="text-sm text-white/90" />
      </div>

      {live && (
        <div className="flex flex-col gap-3">
          <DailyBonusButton claimedToday={claimedToday} balance={balance} />
          {giftOpen && (
            <LiveGiftBar roomId={roomId} balance={initial?.balance ?? balance} />
          )}
        </div>
      )}
    </div>
  );
}
