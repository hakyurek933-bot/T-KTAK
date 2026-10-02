import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { createLog } from "@/lib/log";

export const dynamic = "force-dynamic";

type GoogleUser = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function fail(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

function uniqueUsername(base: string) {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 16) || "kullanici";
}

/** Google OAuth callback: kodu alıp kullanıcıyı bulur/oluşturur ve giriş yapar. */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) fail("Google girişi kurulu değil");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) fail("Google giriş iptal edildi");

  const store = await cookies();
  const expected = store.get("taktik_oauth_state")?.value;
  store.delete("taktik_oauth_state");
  if (!expected || expected !== state) fail("Güvenlik doğrulaması başarısız");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = appUrl || url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Kodu access token ile değiştir.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) fail("Google ile bağlantı kurulamadı");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) fail("Google girişi tamamlanamadı");

  // Kullanıcı bilgisini al.
  const meRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) fail("Google hesabı okunamadı");
  const g = (await meRes.json()) as GoogleUser;
  if (!g.sub || !g.email) fail("Google hesabında e-posta bulunamadı");

  const email = g.email.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: g.sub }, { email }] },
    select: {
      id: true,
      username: true,
      role: true,
      googleId: true,
      emailVerified: true,
      avatarUrl: true,
      banned: true,
      bannedReason: true,
    },
  });

  if (!user) {
    // E-postadan benzersiz kullanıcı adı üret.
    const base = uniqueUsername(email.split("@")[0] ?? "kullanici");
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
        displayName: g.name?.slice(0, 40) || username,
        email,
        emailVerified: g.email_verified ?? true,
        googleId: g.sub,
        avatarUrl: g.picture ?? null,
        // Google ile girenler için rastgele, kullanılmayan şifre.
        passwordHash: await bcrypt.hash(
          `google-${g.sub}-${Math.random().toString(36).slice(2)}`,
          10
        ),
        role: "USER",
      },
    });

    await createLog({
      action: "SIGNUP",
      actorId: user.id,
      detail: `@${user.username} Google ile kayıt oldu`,
    });
  } else if (!user.googleId) {
    // Mevcut hesabı Google kimliğine bağla.
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: g.sub,
        emailVerified: user.emailVerified || g.email_verified === true,
        avatarUrl: user.avatarUrl ?? g.picture ?? null,
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
    detail: `@${user.username} Google ile giriş yaptı`,
  });
  redirect("/");
}
