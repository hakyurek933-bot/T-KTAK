import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthHero } from "@/components/AuthHero";

export const metadata = { title: "Giriş — Taktik" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const oauthError = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <AuthHero title="Tekrar hoş geldin" subtitle="Taktik hesabınla giriş yap." />
      {oauthError && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30">
          {oauthError}
        </p>
      )}
      <LoginForm />
    </div>
  );
}
