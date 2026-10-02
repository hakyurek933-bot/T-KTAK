import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { FollowButton } from "@/components/FollowButton";
import type { Role } from "@prisma/client";

export function FollowList({
  title,
  username,
  tab,
  people,
  meId,
  myFollowing,
}: {
  title: string;
  username: string;
  tab: "followers" | "following";
  people: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: Role;
  }[];
  meId?: string;
  myFollowing: Set<string>;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-3 py-5">
      <h1 className="mb-4 text-lg font-extrabold">{title}</h1>

      <div className="mb-4 flex border-b border-white/10 text-sm">
        <Link
          href={`/u/${username}/followers`}
          className={`flex-1 py-2.5 text-center font-medium ${
            tab === "followers" ? "border-b-2 border-white text-white" : "text-muted"
          }`}
        >
          Takipçiler
        </Link>
        <Link
          href={`/u/${username}/following`}
          className={`flex-1 py-2.5 text-center font-medium ${
            tab === "following" ? "border-b-2 border-white text-white" : "text-muted"
          }`}
        >
          Takip edilenler
        </Link>
      </div>

      {people.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Kimse yok.</p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
          {people.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/u/${u.username}`}>
                <Avatar user={u} size={44} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/u/${u.username}`} className="font-semibold hover:underline">
                    @{u.username}
                  </Link>
                  <RoleTag role={u.role} />
                </div>
                <p className="truncate text-xs text-muted">{u.displayName}</p>
              </div>
              {meId && meId !== u.id && (
                <FollowButton targetId={u.id} initialFollowing={myFollowing.has(u.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
