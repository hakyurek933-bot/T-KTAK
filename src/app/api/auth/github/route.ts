import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** GitHub OAuth başlatma: kullanıcıyı GitHub'a yönlendirir. */
export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "GitHub girişi kurulu değil (GITHUB_CLIENT_ID eksik)" },
      { status: 500 }
    );
  }

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

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);

  return Response.redirect(url.toString());
}
