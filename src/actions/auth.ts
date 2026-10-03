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
  requireUser,
} from "@/lib/auth";
import { createLog } from "@/lib/log";
import { SIGNUP_BONUS } from "@/lib/coins";
import {
  checkVerificationCode,
  clearVerificationCodes,
  emailProviderConfigured,
  sendVerificationEmail,
  storeVerificationCode,
} from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/ratelimit";

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

  // Bot tuzağı: gizli alan doluysa isteği sessizce düşür.
  if (String(formData.get("website") || "").trim()) {
    redirect("/login");
  }

  const ip = await clientIp();
  const signupLimit = rateLimit(`signup:${ip}`, 10, 60 * 60 * 1000);
  if (!signupLimit.ok) {
    return { error: "Çok fazla kayıt denemesi. Bir süre sonra tekrar deneyin." };
  }

  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
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

  // Hoş geldin bonusu: coin altyapısı hazırsa ekle, değilse sessizce geç.
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { coinBalance: { increment: SIGNUP_BONUS } },
    });
    await prisma.coinTransaction.create({
      data: {
        userId: user.id,
        amount: SIGNUP_BONUS,
        reason: "SIGNUP_BONUS",
        note: "Hoş geldin bonusu",
      },
    });
  } catch {
    /* coin sistemi henüz kurulu değilse üyelik yine açılır */
  }

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

  const ip = await clientIp();
  const loginLimit = rateLimit(`login:${ip}`, 20, 5 * 60 * 1000);
  if (!loginLimit.ok) {
    return { error: "Çok fazla giriş denemesi. Birkaç dakika bekleyip tekrar deneyin." };
  }

  const identifier = parsed.data.identifier.toLowerCase();
  const user = identifier.includes("@")
    ? await prisma.user.findUnique({
        where: { email: identifier },
        select: {
          id: true,
          username: true,
          role: true,
          passwordHash: true,
          banned: true,
          bannedReason: true,
          email: true,
          emailVerified: true,
        },
      })
    : await prisma.user.findUnique({
        where: { username: identifier },
        select: {
          id: true,
          username: true,
          role: true,
          passwordHash: true,
          banned: true,
          bannedReason: true,
          email: true,
          emailVerified: true,
        },
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

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, username: true, role: true, emailVerified: true },
  });
  if (!user) return { error: "Bu e-postayla hesap bulunamadı" };
  if (user.emailVerified) redirect("/login");

  const emailLimit = rateLimit(`verify:${parsed.data.email}`, 10, 10 * 60 * 1000);
  if (!emailLimit.ok) {
    return { error: "Çok fazla deneme. Birkaç dakika bekleyip tekrar deneyin." };
  }

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

export async function requestLoginCodeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resendSchema.safeParse({
    email: String(formData.get("email") || ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçerli bir e-posta girin" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, banned: true, bannedReason: true },
  });
  // Hesap yoksa da aynı mesaj (bilgi sızdırmama).
  if (!user) return { error: "Kod gönderilemediyse e-postanı kontrol et" };
  if (user.banned) {
    return {
      error: `Hesabınız askıya alınmış. Sebep: ${user.bannedReason || "belirtilmedi"}`,
    };
  }

  if (!emailProviderConfigured()) {
    return { error: "E-posta servisi kurulu değil, yöneticiyle iletişime geçin" };
  }

  const loginLimit = rateLimit(`logincode:${parsed.data.email}`, 3, 10 * 60 * 1000);
  if (!loginLimit.ok) {
    return { error: "Kodu zaten gönderdik. Birkaç dakika bekleyip tekrar deneyin." };
  }

  const code = await storeVerificationCode(parsed.data.email);
  try {
    await sendVerificationEmail(parsed.data.email, code);
  } catch (err) {
    console.error(err);
    return { error: "Kod gönderilemedi, sonra tekrar deneyin" };
  }
  redirect(`/verify?email=${encodeURIComponent(parsed.data.email)}&mode=login`);
}

export async function loginWithCodeAction(
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

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, username: true, role: true, banned: true, bannedReason: true },
  });
  if (!user) return { error: "Kod hatalı veya süresi dolmuş" };
  if (user.banned) {
    return {
      error: `Hesabınız askıya alınmış. Sebep: ${user.bannedReason || "belirtilmedi"}`,
    };
  }

  const ok = await checkVerificationCode(parsed.data.email, parsed.data.code);
  if (!ok) return { error: "Kod hatalı veya süresi dolmuş" };

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });
  await clearVerificationCodes(parsed.data.email);

  await createSession({ userId: user.id, role: user.role });
  await createLog({
    action: "LOGIN",
    actorId: user.id,
    detail: `@${user.username} e-posta koduyla giriş yaptı`,
  });
  redirect("/");
}

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

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, emailVerified: true },
  });
  if (!user) return { error: "Bu e-postayla hesap bulunamadı" };
  if (user.emailVerified) redirect("/login");

  if (!emailProviderConfigured()) {
    return { error: "E-posta servisi kurulu değil, yöneticiyle iletişime geçin" };
  }

  const resendLimit = rateLimit(`resend:${parsed.data.email}`, 3, 10 * 60 * 1000);
  if (!resendLimit.ok) {
    return { error: "Kodu zaten gönderdik. Birkaç dakika bekleyip tekrar deneyin." };
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

/** Hesabını kalıcı olarak siler (videolar, yorumlar her şey gider). Kurucu silemez. */
export async function deleteAccountAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const user = await requireUser();
  if (user.role === "FOUNDER") {
    return { error: "Kurucu hesabı silinemez" };
  }

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== user.username) {
    return { error: "Onay için kullanıcı adını aynen yazmalısın" };
  }

  const ip = await clientIp();
  const limit = rateLimit(`delaccount:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Çok fazla deneme. Biraz bekle." };

  await createLog({
    action: "BAN",
    actorId: user.id,
    targetId: user.id,
    detail: `@${user.username} hesabını sildi`,
  });
  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/signup");
}
