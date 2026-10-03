"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";
import type { ReportTarget } from "@/lib/reports";
import { deletePostAction } from "@/actions/posts";
import { deleteCommentAction } from "@/actions/comments";

async function checkReportTables() {
  try {
    await prisma.report.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

const createSchema = z.object({
  target: z.enum(["POST", "COMMENT", "USER"]),
  targetId: z.string().min(1),
  reason: z.string().min(1).max(20),
  detail: z.string().trim().max(300).optional(),
});

/** Şikayet oluşturur. Aynı hedefe açık şikayet tekrarlanamaz. */
export async function createReportAction(input: {
  target: ReportTarget;
  targetId: string;
  reason: string;
  detail?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  const limit = rateLimit(`report:${user.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Çok fazla şikayet gönderdin. Biraz bekle." };

  const parsed = createSchema.safeParse({
    ...input,
    detail: input.detail?.trim() || undefined,
  });
  if (!parsed.success) return { error: "Geçersiz şikayet" };

  if (!(await checkReportTables())) {
    return { error: "Şikayet sistemi henüz hazır değil" };
  }

  // Hedef gerçekten var mı?
  try {
    const exists =
      parsed.data.target === "POST"
        ? await prisma.post.findUnique({
            where: { id: parsed.data.targetId },
            select: { id: true },
          })
        : parsed.data.target === "COMMENT"
          ? await prisma.comment.findUnique({
              where: { id: parsed.data.targetId },
              select: { id: true },
            })
          : await prisma.user.findUnique({
              where: { id: parsed.data.targetId },
              select: { id: true },
            });
    if (!exists) return { error: "Şikayet edilen içerik bulunamadı" };
  } catch {
    return { error: "Şikayet sistemi henüz hazır değil" };
  }

  const dup = await prisma.report
    .findFirst({
      where: {
        reporterId: user.id,
        target: parsed.data.target,
        targetId: parsed.data.targetId,
        status: "OPEN",
      },
      select: { id: true },
    })
    .catch(() => null);
  if (dup) return { error: "Bu içeriği zaten şikayet ettin 🐺" };

  await prisma.report.create({
    data: {
      reporterId: user.id,
      target: parsed.data.target,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      detail: parsed.data.detail ?? null,
      status: "OPEN",
    },
  });

  await createLog({
    action: "REPORT_CREATE",
    actorId: user.id,
    detail: `@${user.username} şikayet etti: ${parsed.data.target} (${parsed.data.reason})`,
  });

  revalidatePath("/admin");
  return { ok: true };
}

/** Şikayeti sonuçlandırır (ekip). delete: içeriği de siler (kullanıcıda sadece not). */
export async function reviewReportAction(
  reportId: string,
  decision: "dismiss" | "delete"
): Promise<{ error?: string; ok?: boolean }> {
  const staff = await requireStaff();

  let report: {
    id: string;
    target: "POST" | "COMMENT" | "USER";
    targetId: string;
    reason: string;
    status: "OPEN" | "REVIEWED" | "DISMISSED";
  } | null = null;
  try {
    report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, target: true, targetId: true, reason: true, status: true },
    });
  } catch {
    return { error: "Şikayet sistemi henüz hazır değil" };
  }
  if (!report) return { error: "Şikayet bulunamadı" };
  if (report.status !== "OPEN") return { error: "Bu şikayet zaten incelenmiş" };

  if (decision === "delete" && report.target !== "USER") {
    try {
      if (report.target === "POST") await deletePostAction(report.targetId);
      else await deleteCommentAction(report.targetId);
    } catch {
      /* içerik zaten silinmiş olabilir, kaydı yine kapat */
    }
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: decision === "delete" ? "REVIEWED" : "DISMISSED" },
  });

  await createLog({
    action: "REPORT_REVIEW",
    actorId: staff.id,
    detail: `@${staff.username} şikayeti ${decision === "delete" ? "onaylayıp içeriği sildi" : "reddetti"} (${report.target}/${report.reason})`,
  });

  revalidatePath("/admin");
  return { ok: true };
}
