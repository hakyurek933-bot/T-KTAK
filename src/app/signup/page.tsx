import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/SignupForm";
import { AuthShell } from "@/components/AuthHero";

export const metadata = { title: "Kayıt — Taktik" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthShell active="signup" subtitle="Aklındakini paylaş, meydana çık.">
      <SignupForm />
    </AuthShell>
  );
}
