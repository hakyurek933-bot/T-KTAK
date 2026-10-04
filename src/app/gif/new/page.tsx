import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { GifMaker } from "@/components/GifMaker";

export const dynamic = "force-dynamic";
export const metadata = { title: "GIF yap — Taktik" };

export default async function GifPage({
  searchParams,
}: PageProps<"/gif/new">) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const postId = typeof sp.post === "string" ? sp.post : null;

  let videoUrl: string | null = null;
  if (postId) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true, videoUrl: true, mediaType: true },
      });
      if (post && post.authorId === me.id && post.mediaType !== "image") {
        videoUrl = post.videoUrl;
      }
    } catch {
      videoUrl = null;
    }
  }
  if (!videoUrl) notFound();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <Link
        href="/studio"
        className="mb-3 inline-block text-sm text-muted hover:text-white"
      >
        ← Videolarım
      </Link>
      <h1 className="mb-1 text-2xl font-bold">🎬 GIF yap</h1>
      <p className="mb-6 text-sm text-muted">
        Videodan 2 saniyelik komik anı seç, GIF olsun. Kediler önerilir 🐱
      </p>
      <GifMaker videoUrl={videoUrl} />
    </div>
  );
}
