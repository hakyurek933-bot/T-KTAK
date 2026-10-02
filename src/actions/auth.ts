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
import {
  checkVerificationCode,
  clearVerificationCodes,
  emailProviderConfigured,
  sendVerificationEmail,
  storeVerificationCode,
} from "@/lib/email";

export type ActionState = { error?: string } | null;

const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalı")
    .max(20, "Kullanıcı adı en fazla 20 karakter")
    .regex(/^[a-zA-Z0-9_]+$/, "Sadece harf, rakam ve alt çizgi"),
  displayName: z.string().min(2, "Görünen ad en az 2 karakter").max(40),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin").max(160),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(100),
});

export async function signupAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    username: String(formData.get("username") || "").toLowerCase(),
    displayName: String(formData.get("displayName") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz bilgi" };
  }

  const { username, displayName, email, password } = parsed.data;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (exists) return { error: "Bu kullanıcı adı veya e-posta zaten kullanılıyor" };

  // E-posta servisi yoksa adresi otomatik onaylı say (yerel/Vercel kurulumu takılmaz).
  const verified = !emailProviderConfigured();

  const user = await prisma.user.create({
    data: {
      username,
      displayName,
      email,
      emailVerified: verified,
      passwordHash: await hashPassword(password),
      role: "USER",
    },
  });

  await createLog({
    action: "SIGNUP",
    actorId: user.id,
    detail: `@${user.username} kayıt oldu`,
  });

  if (!verified) {
    const code = await storeVerificationCode(email);
    try {
      await sendVerificationEmail(email, code);
    } catch (err) {
      console.error(err);
      return { error: "Doğrulama e-postası gönderilemedi, sonra tekrar deneyin" };
    }
    redirect(`/verify?email=${encodeURIComponent(email)}`);
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Kullanıcı adı veya e-posta gerekli").max(160),
  password: z.string().min(1, "Şifre gerekli"),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: String(formData.get("identifier") || ""),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) return { error: "Kullanıcı adı ve şifre gerekli" };

  const identifier = parsed.data.identifier.toLowerCase();
  const user = identifier.includes("@")
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findUnique({ where: { username: identifier } });

  // Kullanıcı yoksa da aynı mesajı ver (bilgi sızdırmama).
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Kullanıcı adı veya şifre hatalı" };
  }

  if (user.banned) {
    return {
      error: `Hesabınız askıya alınmış. Sebep: ${user.bannedReason || "belirtilmedi"}`,
    };
  }

  if (user.email && !user.emailVerified && emailProviderConfigured()) {
    return {
      error: "E-postanı doğrulaman gerekiyor. Doğrulama sayfasından kodunu gir.",
    };
  }

  await createSession({ userId: user.id, role: user.role });
  await createLog({ action: "LOGIN", actorId: user.id, detail: `@${user.username} giriş yaptı` });
  redirect("/");
}

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  code: z.string().trim().regex(/^\d{6}$/, "Kod 6 haneli olmalı"),
});

export async function verifyEmailAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = verifySchema.safeParse({
    email: String(formData.get("email") || ""),
    code: String(formData.get("code") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz kod" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: "Bu e-postayla hesap bulunamadı" };
  if (user.emailVerified) redirect("/login");

  const ok = await checkVerificationCode(parsed.data.email, parsed.data.code);
  if (!ok) return { error: "Kod hatalı veya süresi dolmuş" };

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });
  await clearVerificationCodes(parsed.data.email);
  await createLog({
    action: "EMAIL_VERIFY",
    actorId: user.id,
    detail: `@${user.username} e-postasını doğruladı`,
  });

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
});

export async function resendCodeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resendSchema.safeParse({
    email: String(formData.get("email") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz e-posta" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: "Bu e-postayla hesap bulunamadı" };
  if (user.emailVerified) redirect("/login");

  if (!emailProviderConfigured()) {
    return { error: "E-posta servisi kurulu değil, yöneticiyle iletişime geçin" };
  }

  const code = await storeVerificationCode(parsed.data.email);
  try {
    await sendVerificationEmail(parsed.data.email, code);
  } catch (err) {
    console.error(err);
    return { error: "Kod gönderilemedi, sonra tekrar deneyin" };
  }
  return null;
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await createLog({ action: "LOGOUT", actorId: user.id, detail: `@${user.username} çıkış yaptı` });
  }
  await destroySession();
  redirect("/login");
}
