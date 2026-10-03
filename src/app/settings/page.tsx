import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  ProfileSettingsForm,
  PasswordForm,
} from "@/components/ProfileSettingsForm";
import { BlockedList } from "@/components/BlockedList";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ayarlar — Taktik" };

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  let birthdate = "";
  let coverUrl = "";
  try {
    const account = await prisma.user.findUnique({
      where: { id: me.id },
      select: { birthdate: true, coverUrl: true },
    });
    if (account?.birthdate) {
      birthdate = account.birthdate.toISOString().slice(0, 10);
    }
    coverUrl = account?.coverUrl ?? "";
  } catch {
    /* kolon henüz yoksa boş geç */
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 py-5">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/u/${me.username}`} className="text-sm text-muted hover:text-white">
          ← Profile dön
        </Link>
        <h1 className="text-xl font-extrabold">Ayarlar</h1>
      </div>

      <div className="flex flex-col gap-5">
        <ProfileSettingsForm
          username={me.username}
          displayName={me.displayName}
          bio={me.bio ?? ""}
          avatarUrl={me.avatarUrl ?? ""}
          coverUrl={coverUrl}
          birthdate={birthdate}
        />
        <PasswordForm />
        <BlockedList />
        <DeleteAccountForm username={me.username} />

        <div className="rounded-2xl border border-white/10 bg-panel p-4 text-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Hesap
          </h2>
          <p className="text-muted">
            Kullanıcı adı: <span className="text-white">@{me.username}</span>
          </p>
          <p className="mt-1 text-muted">
            Katılım:{" "}
            <span className="text-white">
              {new Date(me.createdAt).toLocaleDateString("tr-TR")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
