import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/SignupForm";
import { AuthHero } from "@/components/AuthHero";

export const metadata = { title: "Kayıt — Taktik" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <AuthHero
        title="Taktik'e katıl"
        subtitle="Videolarını paylaş, insanlarla konuş. +100 🪙 hoş geldin bonusu!"
      />
      <SignupForm />
    </div>
  );
}
