import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FollowList } from "@/components/FollowList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]/followers">) {
  const { username } = await params;
  return { title: `@${username} takipçileri — Taktok` };
}

export default async function FollowersPage({
  params,
}: PageProps<"/u/[username]/followers">) {
  const { username } = await params;
  const me = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true },
  });
  if (!user) notFound();

  const rows = await prisma.follow.findMany({
    where: { followingId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      follower: {
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
      title={`@${user.username} takipçileri`}
      username={user.username}
      tab="followers"
      people={rows.map((r) => r.follower)}
      meId={me?.id}
      myFollowing={myFollowing}
    />
  );
}
