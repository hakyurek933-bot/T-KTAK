import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Chat } from "@/components/Chat";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: PageProps<"/messages/[username]">) {
  const { username } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const other = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      bio: true,
    },
  });

  if (!other) notFound();
  if (other.id === me.id) redirect("/messages");

  const initial = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, receiverId: other.id },
        { senderId: other.id, receiverId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const initialMessages = initial.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    body: m.body,
    kind: m.kind,
    createdAt: m.createdAt.toISOString(),
    read: m.read,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <Link
        href="/messages"
        className="mb-3 inline-block text-sm text-muted hover:text-white"
      >
        ← Tüm mesajlar
      </Link>
      <Chat me={{ id: me.id }} other={other} initialMessages={initialMessages} />
    </div>
  );
}
