import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Kayıt — Taktik" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold">Taktik&apos;e katıl</h1>
      <p className="mb-8 text-sm text-muted">Videolarını paylaş, insanlarla konuş.</p>
      <SignupForm />
    </div>
  );
}
