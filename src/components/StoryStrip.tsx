import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

/** Ana akışın üstündeki hikaye şeridi (giriş yapmışlara). */
export async function StoryStrip() {
  const me = await getCurrentUser();
  if (!me) return null;

  type Row = {
    id: string;
    mediaUrl: string;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role: "FOUNDER" | "MOD" | "USER";
    };
    views: { id: string }[];
  };
  let rows: Row[] = [];
  try {
    rows = await prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        mediaUrl: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
        views: { where: { userId: me.id }, select: { id: true } },
      },
    });
  } catch {
    return null;
  }
  if (rows.length === 0) return null;

  // Yazara göre grupla; izlenmemiş hikayesi olanlar önce.
  const byAuthor = new Map<string, { author: Row["author"]; unseen: boolean }>();
  for (const r of rows) {
    const cur = byAuthor.get(r.author.id);
    const seen = r.views.length > 0;
    if (!cur) byAuthor.set(r.author.id, { author: r.author, unseen: !seen });
    else if (!seen) cur.unseen = true;
  }
  const authors = [...byAuthor.values()].sort(
    (a, b) => Number(b.unseen) - Number(a.unseen)
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-20">
      <div className="pointer-events-auto flex gap-3 overflow-x-auto px-3 py-1">
        <Link
          href="/story/new"
          className="flex w-16 shrink-0 flex-col items-center gap-1"
          title="Hikaye paylaş"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-white/30 bg-black/50 text-xl text-white backdrop-blur">
            +
          </span>
          <span className="text-[10px] font-medium text-white drop-shadow">
            Hikaye
          </span>
        </Link>
        {authors.map(({ author, unseen }) => (
          <Link
            key={author.id}
            href={`/story/${author.username}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            title={`@${author.username}`}
          >
            <span
              className={`rounded-full p-0.5 ${
                unseen
                  ? "bg-gradient-to-tr from-amber-400 via-pink-500 to-brand"
                  : "bg-white/20"
              }`}
            >
              <span className="block rounded-full border-2 border-black">
                <Avatar user={author} size={52} />
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-white drop-shadow">
              {author.id === me.id ? "Sen" : author.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
