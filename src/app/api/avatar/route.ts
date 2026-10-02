import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { ipFromRequest, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Profil fotoğrafı yükleme ucu (resim, en fazla 5 MB). */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const tokenLimit = rateLimit(`avatar:${ipFromRequest(request)}`, 30, 60 * 60 * 1000);
    if (!tokenLimit.ok) {
      return Response.json(
        { error: "Yükleme sınırı aşıldı. Bir süre sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Yükleme için giriş yapmalısınız.");

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
          addRandomSuffix: true,
        };
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yükleme başarısız";
    return Response.json({ error: message }, { status: 400 });
  }
}
