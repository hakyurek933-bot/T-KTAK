import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { ipFromRequest, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Video yükleme ucu (en fazla 50 MB, saatte kullanıcı başına sınırlı). */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const tokenLimit = rateLimit(`upload:${ipFromRequest(request)}`, 30, 60 * 60 * 1000);
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
        // Sadece giriş yapmış kullanıcılar yükleme yapabilir.
        const user = await getCurrentUser();
        if (!user) throw new Error("Yükleme için giriş yapmalısınız.");

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/ogg",
            "video/3gpp",
            "video/3gpp2",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
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
