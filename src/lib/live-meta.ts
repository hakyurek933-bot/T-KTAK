/** Canlı yayın sabitleri. */

export const LIVE_CATEGORIES = [
  { key: "sohbet", emoji: "💬", name: "Sohbet" },
  { key: "oyun", emoji: "🎮", name: "Oyun" },
  { key: "muzik", emoji: "🎵", name: "Müzik" },
  { key: "spor", emoji: "⚽", name: "Spor" },
  { key: "egitim", emoji: "📚", name: "Eğitim" },
  { key: "yemek", emoji: "🍳", name: "Yemek" },
] as const;

/** PK yarışma süresi (dakika). Skor = kazanılan beğeni + hediye coini. */
export const PK_MINUTES = 5;

/** Anket süresi (dakika). */
export const POLL_MINUTES = 5;

/** Susturma süresi (dakika). */
export const MUTE_MINUTES = 10;
