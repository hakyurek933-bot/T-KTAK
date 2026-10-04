import { AccessToken } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Canlı odaya giriş jetonu: yayıncıya yayın, izleyiciye izleme yetkisi. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("room");
  if (!roomId) {
    return Response.json({ error: "room gerekli" }, { status: 400 });
  }

  const me = await getCurrentUser();
  if (!me) {
    return Response.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { id: true, authorId: true, status: true },
  });
  if (!room || room.status !== "LIVE") {
    return Response.json({ error: "Yayın sona ermiş" }, { status: 404 });
  }

  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return Response.json({ error: "Kamera servisi bağlı değil" }, { status: 503 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: me.id,
    name: me.username,
    ttl: "3h",
  });
  at.addGrant({
    roomJoin: true,
    room: `taktik-${room.id}`,
    canPublish: room.authorId === me.id,
    canPublishData: true,
    canSubscribe: true,
  });

  return Response.json({ token: await at.toJwt(), url });
}
