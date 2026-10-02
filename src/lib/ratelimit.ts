import "server-only";
import { headers } from "next/headers";

/**
 * Basit bellek içi hız sınırı (rate limit).
 * Not: Sunucusuz (serverless) ortamda her örneğin kendi sayacı olur;
 * amaç kaba bot/DDOS trafiğini pahalı işlemlerden önce kesmek.
 */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 5000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.reset <= now) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.reset - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** İstemci IP'si (Vercel x-forwarded-for başlığından). */
export async function clientIp() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
    return h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export function ipFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
