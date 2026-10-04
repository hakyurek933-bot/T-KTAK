import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Trend sesler: en çok kullanılan 12 ses adı. */
export async function GET() {
  try {
    const groups = await prisma.post.groupBy({
      by: ["sound"],
      where: { sound: { not: null } },
      _count: true,
      orderBy: { _count: { sound: "desc" } },
      take: 12,
    });
    return Response.json({
      sounds: groups
        .map((g) => ({ name: g.sound as string, count: g._count }))
        .filter((s) => s.name),
    });
  } catch {
    return Response.json({ sounds: [] });
  }
}
