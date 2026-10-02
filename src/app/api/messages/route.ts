import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const me = searchParams.get("me");
  const other = searchParams.get("other");

  if (!me || !other) {
    return Response.json({ error: "me ve other gerekli" }, { status: 400 });
  }

  // Not: Bu, yoklama (polling) için basit bir uçtır. Üretimde oturum
  // doğrulaması ekleyin veya WebSocket/SSE'ye geçin.
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, receiverId: true, body: true, createdAt: true, read: true },
  });

  return Response.json({ messages });
}
