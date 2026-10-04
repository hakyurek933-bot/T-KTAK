import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { createLog } from "@/lib/log";

export const dynamic = "force-dynamic";

type KickUser = {
  user_id?: number;
  name?: string;
  email?: string;
  profile_picture?: string;
};

function fail(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

function uniqueUsername(base: string) {
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 16) || "kullanici"
  );
}

/** Kick OAuth callback: PKCE ile kodu jetona çevirir, giriş yapar. */
export async function GET(request: Request) {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) fail("Kick girişi kurulu değil");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) fail("Kick giriş iptal edildi");

  const store = await cookies();
  const expectedState = store.get("taktik_kick_state")?.value;
  const verifier = store.get("taktik_kick_verifier")?.value;
  store.delete("taktik_kick_state");
  store.delete("taktik_kick_verifier");
  if (!expectedState || expectedState !== state || !verifier) {
    fail("Güvenlik doğrulaması başarısız");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = appUrl || url.origin;
  const redirectUri = `${origin}/api/auth/kick/callback`;

  // Kodu jetonla değiştir (PKCE doğrulamalı).
  const tokenRes = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) fail("Kick ile bağlantı kurulamadı");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) fail("Kick girişi tamamlanamadı");

  // Kullanıcı bilgisini al (jetonun sahibi).
  const meRes = await fetch("https://api.kick.com/public/v1/users", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) fail("Kick hesabı okunamadı");
  const body = (await meRes.json()) as { data?: KickUser[] };
  const k = body.data?.[0];
  if (!k?.user_id || !k?.name) fail("Kick hesabı okunamadı");

  const kickId = String(k.user_id);
  const email = k.email?.toLowerCase() ?? null;

  const or: { kickId?: string; email?: string }[] = [{ kickId }];
  if (email) or.push({ email });

  let user = await prisma.user.findFirst({
    where: { OR: or },
    select: {
      id: true,
      username: true,
      role: true,
      kickId: true,
      emailVerified: true,
      avatarUrl: true,
      banned: true,
      bannedReason: true,
    },
  });

  if (!user) {
    const base = uniqueUsername(k.name);
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
        displayName: k.name.slice(0, 40),
        email,
        emailVerified: false,
        kickId,
        avatarUrl: k.profile_picture ?? null,
        // Kick ile girenler için rastgele, kullanılmayan şifre.
        passwordHash: await bcrypt.hash(
          `kick-${kickId}-${Math.random().toString(36).slice(2)}`,
          10
        ),
        role: "USER",
      },
    });

    await createLog({
      action: "SIGNUP",
      actorId: user.id,
      detail: `@${user.username} Kick ile kayıt oldu`,
    });
  } else if (!user.kickId) {
    // Mevcut hesabı Kick kimliğine bağla.
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        kickId,
        avatarUrl: user.avatarUrl ?? k.profile_picture ?? null,
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
    detail: `@${user.username} Kick ile giriş yaptı`,
  });
  redirect("/");
}
