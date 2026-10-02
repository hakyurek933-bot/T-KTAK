"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";

export type ProfileState = { error?: string; success?: string } | null;

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Görünen ad en az 2 karakter").max(40),
  bio: z.string().trim().max(160, "Biyografi en fazla 160 karakter").optional(),
  avatarUrl: z
    .union([z.string().url("Geçerli bir fotoğraf bağlantısı girin"), z.literal("")])
    .optional(),
});

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    displayName: String(formData.get("displayName") || ""),
    bio: String(formData.get("bio") || "").trim() || undefined,
    avatarUrl: String(formData.get("avatarUrl") || "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz bilgi" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/");
  return { success: "Profilin güncellendi." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mevcut şifre gerekli"),
    next: z.string().min(6, "Yeni şifre en az 6 karakter").max(100),
    confirm: z.string().min(1),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Yeni şifreler eşleşmiyor",
    path: ["confirm"],
  });

export async function changePasswordAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") || ""),
    next: String(formData.get("next") || ""),
    confirm: String(formData.get("confirm") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz şifre" };
  }

  const ok = await verifyPassword(parsed.data.current, user.passwordHash);
  if (!ok) return { error: "Mevcut şifre hatalı" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });

  return { success: "Şifren güncellendi." };
}
