import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PlayIcon, HeartIcon } from "@/components/icons";
import { VideoThumb } from "@/components/VideoThumb";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kaydedilenler — Taktik" };

export default async function SavedPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      post: {
        include: {
          author: { select: { username: true, role: true } },
          likes: { select: { id: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5">
      <h1 className="mb-4 text-xl font-extrabold">Kaydedilenler 🔖</h1>

      {bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted">
          <p className="text-3xl">🔖</p>
          <p className="mt-2 font-semibold text-white">Henüz kaydedilen yok</p>
          <p className="mt-1 text-sm">
            Beğendiğin videoları kaydet, burada saklanır.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
          >
            Videoları keşfet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {bookmarks.map(({ post }) => (
            <Link
              key={post.id}
              href={`/?v=${post.id}`}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-panel-2"
            >
              <VideoThumb src={post.videoUrl} />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                <PlayIcon size={12} />@{post.author.username}
              </div>
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
                <HeartIcon size={12} filled className="text-brand" />
                {post.likes.length}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
