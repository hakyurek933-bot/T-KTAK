import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { createLog } from "@/lib/log";

export const dynamic = "force-dynamic";

type GitHubUser = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function fail(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

/** GitHub OAuth callback: kodu alıp kullanıcıyı bulur/oluşturur ve giriş yapar. */
export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) fail("GitHub girişi kurulu değil");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) fail("GitHub giriş iptal edildi");

  const store = await cookies();
  const expected = store.get("taktik_oauth_state")?.value;
  store.delete("taktik_oauth_state");
  if (!expected || expected !== state) fail("Güvenlik doğrulaması başarısız");

  // Kodu access token ile değiştir.
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  if (!tokenRes.ok) fail("GitHub ile bağlantı kurulamadı");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) fail("GitHub girişi tamamlanamadı");

  const authHeader = {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: "application/json",
  };

  const meRes = await fetch("https://api.github.com/user", { headers: authHeader });
  if (!meRes.ok) fail("GitHub hesabı okunamadı");
  const g = (await meRes.json()) as GitHubUser;

  // Gizli e-postalar için ayrı uçtan asıl adresi al.
  let email: string | null = null;
  const mailRes = await fetch("https://api.github.com/user/emails", {
    headers: authHeader,
  });
  if (mailRes.ok) {
    const emails = (await mailRes.json()) as GitHubEmail[];
    email =
      emails.find((e) => e.primary && e.verified)?.email ??
      emails.find((e) => e.verified)?.email ??
      null;
  }
  if (!email) fail("GitHub hesabında doğrulanmış e-posta bulunamadı");

  const normalized = email.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { OR: [{ githubId: String(g.id) }, { email: normalized }] },
    select: {
      id: true,
      username: true,
      role: true,
      githubId: true,
      emailVerified: true,
      avatarUrl: true,
      banned: true,
      bannedReason: true,
    },
  });

  if (!user) {
    const base =
      g.login.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 16) ||
      "kullanici";
    let username = base;
    for (let i = 1; i < 50; i++) {
      const taken = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!taken) break;
      username = `${base}${i}`;
    }

    user = await prisma.user.create({
      data: {
        username,
        displayName: g.name?.slice(0, 40) || g.login,
        email: normalized,
        emailVerified: true,
        githubId: String(g.id),
        avatarUrl: g.avatar_url ?? null,
        // GitHub ile girenler için rastgele, kullanılmayan şifre.
        passwordHash: await bcrypt.hash(
          `github-${g.id}-${Math.random().toString(36).slice(2)}`,
          10
        ),
        role: "USER",
      },
    });

    await createLog({
      action: "SIGNUP",
      actorId: user.id,
      detail: `@${user.username} GitHub ile kayıt oldu`,
    });
  } else if (!user.githubId) {
    // Mevcut hesabı GitHub kimliğine bağla.
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId: String(g.id),
        emailVerified: true,
        avatarUrl: user.avatarUrl ?? g.avatar_url ?? null,
      },
    });
  }

  if (user.banned) {
    fail(`Hesabınız askıya alınmış. Sebep: ${user.bannedReason || "belirtilmedi"}`);
  }

  await createSession({ userId: user.id, role: user.role });
  await createLog({
    action: "LOGIN",
    actorId: user.id,
    detail: `@${user.username} GitHub ile giriş yaptı`,
  });
  redirect("/");
}
