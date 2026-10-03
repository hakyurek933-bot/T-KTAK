import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { MarkAllRead } from "@/components/MarkAllRead";
import { timeAgo } from "@/lib/utils";
import { HeartIcon, CommentIcon, PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bildirimler — Taktik" };

const TEXT: Record<string, string> = {
  LIKE: "videonu beğendi",
  COMMENT: "videona yorum yaptı",
  REPLY: "yorumuna yanıt verdi",
  FOLLOW: "seni takip etmeye başladı",
  MENTION: "senden bahsetti",
  LIVE: "canlı yayın başlattı 🔴",
};

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      actor: {
        select: { username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-xl px-3 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Bildirimler</h1>
        {unread > 0 && <MarkAllRead />}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted">
          <p className="text-3xl">🔔</p>
          <p className="mt-2 font-semibold text-white">Henüz bildirim yok</p>
          <p className="mt-1 text-sm">
            Biri seninle etkileşime geçtiğinde burada görünecek.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={
                  n.type === "FOLLOW"
                    ? `/u/${n.actor.username}`
                    : n.type === "LIVE"
                      ? "/live"
                      : n.postId
                        ? `/?v=${n.postId}`
                        : "/"
                }
                className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 ${
                  n.read ? "" : "bg-brand/5"
                }`}
              >
                <div className="relative">
                  <Avatar user={n.actor} size={42} />
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ink">
                    {n.type === "LIKE" ? (
                      <HeartIcon size={14} filled />
                    ) : n.type === "FOLLOW" ? (
                      <PlusIcon size={14} className="text-brand" />
                    ) : n.type === "LIVE" ? (
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                    ) : (
                      <CommentIcon size={14} className="text-brand-2" />
                    )}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">@{n.actor.username}</span>{" "}
                    <span className="text-muted">{TEXT[n.type] ?? "bir etkileşim"}</span>
                  </p>
                  <p className="text-xs text-muted">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-brand" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
