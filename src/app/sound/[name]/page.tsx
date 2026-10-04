import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VideoThumb } from "@/components/VideoThumb";
import { SoundPreviewButton } from "@/components/SoundPreviewButton";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/sound/[name]">) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  return { title: `🎵 ${decoded} — Taktik` };
}

export default async function SoundPage({ params }: PageProps<"/sound/[name]">) {
  const { name } = await params;
  const decoded = decodeURIComponent(name).slice(0, 60);

  let posts: {
    id: string;
    videoUrl: string;
    mediaType: string | null;
    soundUrl: string | null;
    author: { username: string };
    likes: { id: string }[];
  }[] = [];
  try {
    posts = await prisma.post.findMany({
      where: { sound: decoded },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        videoUrl: true,
        mediaType: true,
        soundUrl: true,
        author: { select: { username: true } },
        likes: { select: { id: true } },
      },
    });
  } catch {
    posts = [];
  }
  if (posts.length === 0) notFound();

  const previewUrl = posts.map((p) => p.soundUrl).find(Boolean) ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-5">
      <div className="mb-1 flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-2xl">
          🎵
        </span>
        <div>
          <h1 className="truncate text-xl font-extrabold">{decoded}</h1>
          <p className="text-sm text-muted">
            {posts.length} video bu sesi kullanıyor
          </p>
          {previewUrl && (
            <div className="mt-2">
              <SoundPreviewButton url={previewUrl} />
            </div>
          )}
        </div>
      </div>
      <Link
        href="/upload"
        className="mb-4 inline-block rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white"
      >
        Bu sesle paylaş +
      </Link>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/?v=${p.id}`}
            className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-panel-2"
          >
            <VideoThumb
              src={p.videoUrl}
              kind={p.mediaType === "image" ? "image" : "video"}
            />
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-xs font-semibold text-white drop-shadow">
              @{p.author.username} · ❤️ {formatCount(p.likes.length)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
