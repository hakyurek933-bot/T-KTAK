import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const other = searchParams.get("other");

  if (!other) {
    return Response.json({ error: "other gerekli" }, { status: 400 });
  }

  const me = await getCurrentUser();
  if (!me) {
    return Response.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: other },
    select: { id: true },
  });
  if (!otherUser) {
    return Response.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, receiverId: otherUser.id },
        { senderId: otherUser.id, receiverId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, receiverId: true, body: true, createdAt: true, read: true },
  });

  return Response.json({ messages });
}
