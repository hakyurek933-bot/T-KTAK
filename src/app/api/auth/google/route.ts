import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** Google OAuth başlatma: kullanıcıyı Google'a yönlendirir. */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "Google girişi kurulu değil (GOOGLE_CLIENT_ID eksik)" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = appUrl || "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/google/callback`;

  const state =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const store = await cookies();
  store.set("taktik_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);

  return Response.redirect(url.toString());
}
