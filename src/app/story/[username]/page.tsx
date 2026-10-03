import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StoryViewer, type StoryItem } from "@/components/StoryViewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/story/[username]">) {
  const { username } = await params;
  return { title: `@${username} hikayeleri — Taktik` };
}

export default async function StoryPage({ params }: PageProps<"/story/[username]">) {
  const { username } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  let stories: StoryItem[] = [];
  try {
    const rows = await prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        author: { username: username.toLowerCase() },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        mediaUrl: true,
        mediaType: true,
        caption: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    stories = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } catch {
    stories = [];
  }
  if (stories.length === 0) notFound();

  const isOwner = stories[0].author.id === me.id;

  return (
    <div className="mx-auto w-full max-w-lg px-3 py-4">
      <Link
        href="/"
        className="mb-3 inline-block text-sm text-muted hover:text-white"
      >
        ← Akışa dön
      </Link>
      <StoryViewer stories={stories} isOwner={isOwner} />
    </div>
  );
}
