import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Dağıtım tanılama ucu. Yalnızca yönetici ekibi görebilir;
 * diğerleri 404 alır. Gizli değerleri asla döndürmez.
 */
export async function GET() {
  const me = await getCurrentUser().catch(() => null);
  if (!me || !isStaff(me.role)) {
    return Response.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const env = {
    database: hasDatabaseUrl(),
    authSecret: Boolean(process.env.AUTH_SECRET),
    blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };

  try {
    await prisma.user.findFirst({ select: { id: true } });
    return Response.json({
      ok: true,
      env,
      time: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        env,
        error: "Veritabanı bağlantısı başarısız",
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
