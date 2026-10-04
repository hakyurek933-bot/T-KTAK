import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthShell } from "@/components/AuthHero";

export const metadata = { title: "Giriş — Taktik" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const oauthError = typeof sp.error === "string" ? sp.error : null;

  return (
    <AuthShell active="login" subtitle="Kısa video, canlı yayın, mesaj.">
      {oauthError && (
        <p className="mb-3 text-xs text-red-600">{oauthError}</p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
