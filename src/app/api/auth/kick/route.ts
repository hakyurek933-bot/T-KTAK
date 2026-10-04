import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Kick OAuth başlatma: PKCE üretip kullanıcıyı Kick'e yönlendirir. */
export async function GET() {
  const clientId = process.env.KICK_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "Kick girişi kurulu değil (KICK_CLIENT_ID eksik)" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = appUrl || "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/kick/callback`;

  const state = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(
    createHash("sha256").update(verifier).digest()
  );

  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  store.set("taktik_kick_state", state, common);
  store.set("taktik_kick_verifier", verifier, common);

  const url = new URL("https://id.kick.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "user:read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return Response.redirect(url.toString());
}
