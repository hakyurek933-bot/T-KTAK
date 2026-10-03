import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UnblockButton } from "@/components/UnblockButton";

/** Ayarlardaki engellenenler listesi. */
export async function BlockedList() {
  const me = await getCurrentUser();
  if (!me) return null;

  let blocked: { id: string; username: string; displayName: string }[] = [];
  try {
    const rows = await prisma.block.findMany({
      where: { blockerId: me.id },
      orderBy: { createdAt: "desc" },
      select: {
        blockedId: true,
        blocked: { select: { username: true, displayName: true } },
      },
    });
    blocked = rows.map((r) => ({
      id: r.blockedId,
      username: r.blocked.username,
      displayName: r.blocked.displayName,
    }));
  } catch {
    return null;
  }

  if (blocked.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4 text-sm">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
        Engellenenler ({blocked.length})
      </h2>
      <ul className="divide-y divide-white/5">
        {blocked.map((u) => (
          <li key={u.id} className="flex items-center gap-2 py-2">
            <Link
              href={`/u/${u.username}`}
              className="flex-1 truncate font-medium hover:underline"
            >
              @{u.username}
              <span className="ml-1 text-xs text-muted">{u.displayName}</span>
            </Link>
            <UnblockButton targetId={u.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
