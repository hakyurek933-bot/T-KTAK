"use server";

import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export type SongItem = {
  id: string;
  artist: string;
  title: string;
  previewUrl: string;
  artwork: string;
};

/** İnternetten şarkı arama (iTunes kataloğu, anahtarsız ve ücretsiz).
 *  30 saniyelik önizlemelerle döner. */
export async function searchSongsAction(
  query: string
): Promise<{ error?: string; items?: SongItem[] }> {
  const user = await requireUser();

  const q = query.trim().slice(0, 60);
  if (q.length < 2) return { items: [] };

  const limit = rateLimit(`song:${user.id}`, 30, 60 * 1000);
  if (!limit.ok) return { error: "Çok hızlı arıyorsun. Biraz bekle." };

  try {
    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}` +
      `&media=music&entity=song&limit=15&lang=tr_tr&country=TR`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return { error: "Şarkı aranamadı" };
    const data = (await res.json()) as {
      results?: {
        trackId?: number;
        artistName?: string;
        trackName?: string;
        previewUrl?: string;
        artworkUrl100?: string;
      }[];
    };
    const items: SongItem[] =
      data.results
        ?.filter((r) => r.previewUrl && r.trackName)
        .map((r) => ({
          id: String(r.trackId ?? `${r.artistName}-${r.trackName}`),
          artist: r.artistName ?? "Bilinmiyor",
          title: r.trackName ?? "",
          previewUrl: r.previewUrl as string,
          artwork: (r.artworkUrl100 ?? "").replace("100x100", "200x200"),
        })) ?? [];
    return { items };
  } catch {
    return { error: "Şarkı aranamadı" };
  }
}
