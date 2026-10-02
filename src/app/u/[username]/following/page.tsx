import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FollowList } from "@/components/FollowList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]/following">) {
  const { username } = await params;
  return { title: `@${username} takip ettikleri — Taktik` };
}

export default async function FollowingPage({
  params,
}: PageProps<"/u/[username]/following">) {
  const { username } = await params;
  const me = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!user) notFound();

  const rows = await prisma.follow.findMany({
    where: { followerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      following: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  const myFollowing = me
    ? new Set(
        (
          await prisma.follow.findMany({
            where: { followerId: me.id },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      )
    : new Set<string>();

  return (
    <FollowList
      title={`@${user.username} takip ettikleri`}
      username={user.username}
      tab="following"
      people={rows.map((r) => r.following)}
      meId={me?.id}
      myFollowing={myFollowing}
    />
  );
}
