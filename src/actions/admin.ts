"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaff } from "@/lib/auth";
import { createLog } from "@/lib/log";

export type AdminState = { error?: string; success?: string } | null;

const banSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(200).optional(),
});

/** Kullanıcıyı banla. Moderatör sadece normal üyeleri, kurucu herkesi banlayabilir. */
export async function banUserAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  const parsed = banSchema.safeParse({
    userId: String(formData.get("userId") || ""),
    reason: String(formData.get("reason") || "").trim() || undefined,
  });
  if (!parsed.success) return { error: "Geçersiz istek." };

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "Kullanıcı bulunamadı." };
  if (target.id === staff.id) return { error: "Kendinizi banlayamazsınız." };

  // Yetki hiyerarşisi: mod kurucuyu/mod'u banlayamaz.
  if (staff.role === "MOD" && isStaff(target.role)) {
    return { error: "Bir moderatör yönetici ekibini banlayamaz." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      banned: true,
      bannedReason: parsed.data.reason ?? "Kural ihlali",
      bannedAt: new Date(),
    },
  });

  await createLog({
    action: "BAN",
    actorId: staff.id,
    targetId: target.id,
    detail: `@${staff.username} -> @${target.username} banladı. Sebep: ${parsed.data.reason ?? "Kural ihlali"}`,
  });

  revalidatePath("/admin");
  revalidatePath(`/u/${target.username}`);
  return { success: `@${target.username} banlandı.` };
}

const unbanSchema = z.object({ userId: z.string().min(1) });

export async function unbanUserAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  const parsed = unbanSchema.safeParse({
    userId: String(formData.get("userId") || ""),
  });
  if (!parsed.success) return { error: "Geçersiz istek." };

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "Kullanıcı bulunamadı." };

  await prisma.user.update({
    where: { id: target.id },
    data: { banned: false, bannedReason: null, bannedAt: null },
  });

  await createLog({
    action: "UNBAN",
    actorId: staff.id,
    targetId: target.id,
    detail: `@${staff.username}, @${target.username} kullanıcısının banını kaldırdı`,
  });

  revalidatePath("/admin");
  revalidatePath(`/u/${target.username}`);
  return { success: `@${target.username} kullanıcısının banı kaldırıldı.` };
}

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "MOD", "FOUNDER"]),
});

/** Rol değiştirme yalnızca kurucuya açıktır. */
export async function changeRoleAction(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  if (staff.role !== "FOUNDER") {
    return { error: "Rol değiştirme yetkisi sadece kurucuda." };
  }

  const parsed = roleSchema.safeParse({
    userId: String(formData.get("userId") || ""),
    role: String(formData.get("role") || ""),
  });
  if (!parsed.success) return { error: "Geçersiz rol." };

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "Kullanıcı bulunamadı." };
  if (target.id === staff.id) return { error: "Kendi rolünüzü değiştiremezsiniz." };

  await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });

  await createLog({
    action: "ROLE_CHANGE",
    actorId: staff.id,
    targetId: target.id,
    detail: `@${staff.username}, @${target.username} rolünü ${target.role} -> ${parsed.data.role} yaptı`,
  });

  revalidatePath("/admin");
  return { success: `@${target.username} rolü ${parsed.data.role} olarak güncellendi.` };
}
