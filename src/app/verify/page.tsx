import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { VerifyForm } from "@/components/VerifyForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "E-posta doğrulama — Taktik" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  if (!email) redirect("/signup");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold">E-postanı doğrula</h1>
      <p className="mb-8 text-sm text-muted">
        <span className="text-white">{email}</span> adresine 6 haneli bir kod
        gönderdik. Kod 15 dakika geçerli.
      </p>
      <VerifyForm email={email} />
    </div>
  );
}
