import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Sadece giriş yapmış kullanıcılar yükleme yapabilir.
        const user = await getCurrentUser();
        if (!user) throw new Error("Yükleme için giriş yapmalısınız.");

        return {
          allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
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
