import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Dağıtım tanılama ucu. Gizli değerleri asla döndürmez; yalnızca
 * gerekli ortam değişkenlerinin tanımlı olup olmadığını ve
 * veritabanına erişilip erişilemediğini bildirir.
 */
export async function GET() {
  const env = {
    database: hasDatabaseUrl(),
    authSecret: Boolean(process.env.AUTH_SECRET),
    blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
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
