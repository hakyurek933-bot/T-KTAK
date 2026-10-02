import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesajlar — Taktik" };

export default async function MessagesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  // Bana gelen/giden son mesajları çekip sohbetleri grupla.
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
      receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
    },
  });

  const conversations = new Map<
    string,
    {
      user: (typeof messages)[number]["sender"];
      last: (typeof messages)[number];
      unread: number;
    }
  >();

  for (const m of messages) {
    const other = m.senderId === me.id ? m.receiver : m.sender;
    if (!conversations.has(other.id)) {
      conversations.set(other.id, { user: other, last: m, unread: 0 });
    }
    if (m.receiverId === me.id && !m.read) {
      conversations.get(other.id)!.unread += 1;
    }
  }

  // Mesajı olmayan üyelerle de yeni sohbet başlatılabilsin.
  const allUsers = await prisma.user.findMany({
    where: { id: { not: me.id }, banned: false },
    select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
    take: 30,
    orderBy: { createdAt: "asc" },
  });

  const list = Array.from(conversations.values());
  const known = new Set(list.map((c) => c.user.id));
  const others = allUsers.filter((u) => !known.has(u.id));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Mesajlar</h1>

      {list.length > 0 && (
        <ul className="mb-8 flex flex-col divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
          {list.map((c) => (
            <li key={c.user.id}>
              <Link
                href={`/messages/${c.user.username}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
              >
                <Avatar user={c.user} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">@{c.user.username}</span>
                    <RoleTag role={c.user.role} />
                    {c.unread > 0 && (
                      <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted">{c.last.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {timeAgo(c.last.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Yeni sohbet başlat
      </h2>
      <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
        {others.length === 0 && (
          <li className="px-4 py-6 text-sm text-muted">
            Başka kullanıcı yok. Yeni üyeler katıldığında burada görünecek.
          </li>
        )}
        {others.map((u) => (
          <li key={u.id}>
            <Link
              href={`/messages/${u.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
            >
              <Avatar user={u} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">@{u.username}</span>
                  <RoleTag role={u.role} />
                </div>
                <p className="truncate text-xs text-muted">{u.displayName}</p>
              </div>
              <span className="text-brand-2">Mesaj →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
