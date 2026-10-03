import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StudioList } from "@/components/StudioList";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Videolarım — Taktik" };

export default async function StudioPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  let posts: {
    id: string;
    videoUrl: string;
    caption: string | null;
    viewCount: number;
    promotedUntil: Date | null;
    createdAt: Date;
    _count: { likes: number; comments: number };
  }[] = [];
  try {
    posts = await prisma.post.findMany({
      where: { authorId: me.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        videoUrl: true,
        caption: true,
        viewCount: true,
        promotedUntil: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    });
  } catch {
    posts = [];
  }

  const totalViews = posts.reduce((s, p) => s + p.viewCount, 0);
  const totalLikes = posts.reduce((s, p) => s + p._count.likes, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">🎬 Videolarım</h1>
          <p className="mt-0.5 text-sm text-muted">
            {posts.length} video · 👁 {formatCount(totalViews)} izlenme · ❤️{" "}
            {formatCount(totalLikes)} beğeni
          </p>
        </div>
        <Link
          href="/upload"
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          + Yeni video
        </Link>
      </div>

      <StudioList
        posts={posts.map((p) => ({
          id: p.id,
          videoUrl: p.videoUrl,
          caption: p.caption,
          viewCount: p.viewCount,
          promotedUntil: p.promotedUntil ? p.promotedUntil.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
          likes: p._count.likes,
          comments: p._count.comments,
        }))}
      />
    </div>
  );
}
