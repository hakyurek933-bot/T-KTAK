import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlayIcon, HeartIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/tag/[tag]">) {
  const { tag } = await params;
  return { title: `#${tag} — Taktik` };
}

export default async function TagPage({ params }: PageProps<"/tag/[tag]">) {
  const { tag } = await params;
  const clean = tag.toLowerCase().replace(/[^a-z0-9_]/g, "");

  const posts = await prisma.post.findMany({
    where: { caption: { contains: `#${clean}`, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      author: { select: { username: true, role: true } },
      likes: { select: { id: true } },
    },
  });

  const totalLikes = posts.reduce((a, p) => a + p.likes.length, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5">
      <div className="mb-4 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-2xl font-black text-ink">
          #
        </div>
        <div>
          <h1 className="text-xl font-extrabold">#{clean}</h1>
          <p className="text-sm text-muted">
            {posts.length} video · {totalLikes} beğeni
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted">
          Bu hashtag ile henüz video yok.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/?v=${p.id}`}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-panel-2"
            >
              <video
                src={p.videoUrl}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                <PlayIcon size={12} />@{p.author.username}
              </div>
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                <HeartIcon size={12} filled className="text-brand" />
                {p.likes.length}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
