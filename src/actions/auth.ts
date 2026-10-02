"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  getCurrentUser,
} from "@/lib/auth";
import { createLog } from "@/lib/log";

export type ActionState = { error?: string } | null;

const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalı")
    .max(20, "Kullanıcı adı en fazla 20 karakter")
    .regex(/^[a-zA-Z0-9_]+$/, "Sadece harf, rakam ve alt çizgi"),
  displayName: z.string().min(2, "Görünen ad en az 2 karakter").max(40),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(100),
});

export async function signupAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    username: String(formData.get("username") || "").toLowerCase(),
    displayName: String(formData.get("displayName") || ""),
    password: String(formData.get("password") || ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz bilgi" };
  }

  const { username, displayName, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "Bu kullanıcı adı zaten alınmış" };

  const user = await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: await hashPassword(password),
      role: "USER",
    },
  });

  await createLog({
    action: "SIGNUP",
    actorId: user.id,
    detail: `@${user.username} kayıt oldu`,
  });

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: String(formData.get("username") || "").toLowerCase(),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) return { error: "Kullanıcı adı ve şifre gerekli" };

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  // Kullanıcı yoksa da aynı mesajı ver (bilgi sızdırmama).
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Kullanıcı adı veya şifre hatalı" };
  }

  if (user.banned) {
    return {
      error: `Hesabınız askıya alınmış. Sebep: ${user.bannedReason || "belirtilmedi"}`,
    };
  }

  await createSession({ userId: user.id, role: user.role });
  await createLog({ action: "LOGIN", actorId: user.id, detail: `@${user.username} giriş yaptı` });
  redirect("/");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await createLog({ action: "LOGOUT", actorId: user.id, detail: `@${user.username} çıkış yaptı` });
  }
  await destroySession();
  redirect("/login");
}
