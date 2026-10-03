/** Seviye + rozet sistemi (tamamen hesaplanır, ek tablo gerektirmez).
 * XP: video başına 20, takipçi başına 5, alınan beğeni başına 2, hediye başına 3. */

const LEVEL_XP = [0, 100, 300, 600, 1000, 1600, 2500, 4000, 6000, 9000, 13000];

const LEVEL_TITLES = [
  "Yeni Üye",
  "Aktif Üye",
  "Yükselen",
  "Fenomen Adayı",
  "Yıldız",
  "Süper Yıldız",
  "Efsane",
  "Efsane+",
  "Efsane++",
  "Efsane+++",
  "Taktik Efsanesi",
];

export type LevelInfo = {
  level: number;
  title: string;
  xp: number;
  nextXp: number | null;
  progress: number; // 0-100
};

export function xpForActivity(input: {
  posts: number;
  followers: number;
  likes: number;
  gifts: number;
}): number {
  return (
    input.posts * 20 + input.followers * 5 + input.likes * 2 + input.gifts * 3
  );
}

export function levelForXp(xp: number): LevelInfo {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1;
  }
  const cur = LEVEL_XP[level - 1];
  const next = level < LEVEL_XP.length ? LEVEL_XP[level] : null;
  const progress =
    next === null
      ? 100
      : Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100));
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xp,
    nextXp: next,
    progress,
  };
}

export type Badge = {
  key: string;
  emoji: string;
  name: string;
  desc: string;
};

export function badgesFor(input: {
  isStaff: boolean;
  posts: number;
  likes: number;
  lives: number;
  gifts: number;
  balance: number;
}): Badge[] {
  const list: Badge[] = [];
  if (input.isStaff)
    list.push({ key: "staff", emoji: "👑", name: "Ekip", desc: "Taktik ekibi" });
  if (input.posts >= 1)
    list.push({ key: "creator", emoji: "🎬", name: "Üretici", desc: "İlk videosunu paylaştı" });
  if (input.posts >= 10)
    list.push({ key: "director", emoji: "🎥", name: "Yönetmen", desc: "10+ video paylaştı" });
  if (input.likes >= 100)
    list.push({ key: "star", emoji: "🔥", name: "Keşfet Yıldızı", desc: "100+ beğeni aldı" });
  if (input.lives >= 1)
    list.push({ key: "caster", emoji: "📡", name: "Yayıncı", desc: "Canlı yayın açtı" });
  if (input.gifts >= 1)
    list.push({ key: "supporter", emoji: "🎁", name: "Destekçi", desc: "Canlıda hediye gönderdi" });
  if (input.balance >= 500)
    list.push({ key: "rich", emoji: "💰", name: "Coin Zengini", desc: "500+ coin biriktirdi" });
  return list;
}
