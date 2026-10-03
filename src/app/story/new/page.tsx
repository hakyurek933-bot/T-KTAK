import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { StoryCreateForm } from "@/components/StoryCreateForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hikaye paylaş — Taktik" };

export default async function NewStoryPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Yeni hikaye</h1>
      <p className="mb-6 text-sm text-muted">
        24 saat sonra kaybolur. Takipçilerin ana akışın üstünde görür.
      </p>
      <StoryCreateForm />
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-muted hover:text-white"
      >
        ← Akışa dön
      </Link>
    </div>
  );
}
