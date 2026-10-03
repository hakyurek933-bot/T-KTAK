"use server";

import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export type GifItem = { url: string; preview: string };

/** Tenor GIF araması (anahtar yoksa istemciye kurulum notu döner). */
export async function searchGifsAction(
  query: string
): Promise<{ error?: string; items?: GifItem[]; needsKey?: boolean }> {
  const user = await requireUser();

  const q = query.trim().slice(0, 50);
  if (!q) return { items: [] };

  const limit = rateLimit(`gif:${user.id}`, 30, 60 * 1000);
  if (!limit.ok) return { error: "Çok hızlı arıyorsun. Biraz bekle." };

  const key = process.env.TENOR_API_KEY;
  if (!key) return { needsKey: true, items: [] };

  try {
    const url =
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}` +
      `&key=${key}&limit=12&media_filter=gif,tinygif&locale=tr_TR`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { error: "GIF aranamadı" };
    const data = (await res.json()) as {
      results?: { media_formats?: { gif?: { url?: string }; tinygif?: { url?: string } } }[];
    };
    const items: GifItem[] =
      data.results
        ?.map((r) => ({
          url: r.media_formats?.gif?.url ?? "",
          preview: r.media_formats?.tinygif?.url ?? "",
        }))
        .filter((g) => g.url) ?? [];
    return { items };
  } catch {
    return { error: "GIF aranamadı" };
  }
}
