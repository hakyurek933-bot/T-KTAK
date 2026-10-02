import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UploadForm } from "@/components/UploadForm";

export const metadata = { title: "Video yükle — Taktik" };

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Yeni video</h1>
      <p className="mb-6 text-sm text-muted">
        Bir video yükle veya bağlantı ekle, açıklamasını yaz.
      </p>
      <UploadForm />
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-muted hover:text-white"
      >
        ← Akışa dön
      </Link>
    </div>
  );
}
