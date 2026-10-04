export const dynamic = "force-dynamic";

/** Yayındaki kod sürümü (istemci "yeni sürüm var mı?" diye yoklar). */
export async function GET() {
  return Response.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
}
