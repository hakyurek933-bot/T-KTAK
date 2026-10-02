import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Giriş — Taktok" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold">Tekrar hoş geldin</h1>
      <p className="mb-8 text-sm text-muted">Taktok hesabınla giriş yap.</p>
      <LoginForm />
      <div className="mt-8 rounded-xl border border-white/10 bg-panel-2/50 p-3 text-xs text-muted">
        Demo kurucu hesabı: <span className="text-white">kurucu</span> / şifre:{" "}
        <span className="text-white">kurucu1234</span>
      </div>
    </div>
  );
}
