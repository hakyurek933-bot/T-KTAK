import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UploadForm } from "@/components/UploadForm";

export const metadata = { title: "Video yükle — Taktik" };

export default async function UploadPage({
  searchParams,
}: PageProps<"/upload">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Düet modu: ?duet=<videoId> ile gelindiyse orijinali forma taşı.
  const sp = await searchParams;
  const duetId = typeof sp.duet === "string" ? sp.duet : null;
  let duetOf: {
    id: string;
    videoUrl: string;
    author: { username: string };
  } | null = null;
  if (duetId) {
    try {
      duetOf = await prisma.post.findUnique({
        where: { id: duetId },
        select: {
          id: true,
          videoUrl: true,
          author: { select: { username: true } },
        },
      });
    } catch {
      duetOf = null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">
        {duetOf ? "🎭 Düet çek" : "Yeni video"}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {duetOf
          ? `@${duetOf.author.username} videosuna yan yana tepki çek`
          : "Bir video yükle veya bağlantı ekle, açıklamasını yaz."}
      </p>
      <UploadForm duetOf={duetOf} />
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-muted hover:text-white"
      >
        ← Akışa dön
      </Link>
    </div>
  );
}
