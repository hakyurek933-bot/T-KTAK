import "server-only";
import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 dakika

export function emailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** 6 haneli doğrulama kodu üretir ve SHA-256 özetini döndürür. */
export function generateCode() {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = createHash("sha256").update(code).digest("hex");
  return { code, codeHash };
}

export async function storeVerificationCode(email: string) {
  const { code, codeHash } = generateCode();
  const normalized = email.toLowerCase();

  await prisma.verificationCode.deleteMany({ where: { email: normalized } });
  await prisma.verificationCode.create({
    data: {
      email: normalized,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return code;
}

export async function checkVerificationCode(email: string, code: string) {
  const normalized = email.toLowerCase().trim();
  const record = await prisma.verificationCode.findFirst({
    where: { email: normalized },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;
  if (record.expiresAt < new Date()) return false;

  const codeHash = createHash("sha256").update(code.trim()).digest("hex");
  return codeHash === record.codeHash;
}

export async function clearVerificationCodes(email: string) {
  await prisma.verificationCode.deleteMany({ where: { email: email.toLowerCase() } });
}

/**
 * Doğrulama e-postası gönderir (Resend API).
 * Anahtar tanımlı değilse e-posta atlanıp true dönülür;
 * çağıran taraf bu durumda adresi otomatik onaylı sayar.
 */
export async function sendVerificationEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return "skipped" as const;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Taktik doğrulama kodun",
      text: `Taktik doğrulama kodun: ${code}\nBu kod 15 dakika geçerlidir.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`E-posta gönderilemedi (${res.status}): ${body.slice(0, 200)}`);
  }
  return "sent" as const;
}
