/** Taktik Coin: uygulama içi para birimi.
 * Kazanma: kayıt bonusu, günlük bonus, video ödülü, canlı hediye geliri.
 * Harcama: canlı yayınlarda hediye gönderme. */

export const SIGNUP_BONUS = 100;
export const DAILY_BONUS = 50;
export const UPLOAD_REWARD = 10;

export type Gift = {
  key: string;
  emoji: string;
  name: string;
  cost: number;
};

/** Canlı yayın hediye kataloğu (ücret: coin). */
export const GIFTS: Gift[] = [
  { key: "rose", emoji: "🌹", name: "Gül", cost: 1 },
  { key: "coffee", emoji: "☕", name: "Kahve", cost: 5 },
  { key: "bear", emoji: "🧸", name: "Ayıcık", cost: 20 },
  { key: "diamond", emoji: "💎", name: "Elmas", cost: 50 },
  { key: "rocket", emoji: "🚀", name: "Roket", cost: 100 },
  { key: "crown", emoji: "👑", name: "Taç", cost: 200 },
];

export function findGift(key: string): Gift | undefined {
  return GIFTS.find((g) => g.key === key);
}

/** Coin hareket sebeplerinin Türkçe karşılıkları (admin paneli için). */
export const COIN_REASON_LABELS: Record<string, string> = {
  SIGNUP_BONUS: "Kayıt bonusu",
  DAILY_BONUS: "Günlük bonus",
  UPLOAD_REWARD: "Video ödülü",
  GIFT_SENT: "Hediye gönderdi",
  GIFT_EARNED: "Hediye kazandı",
  ADMIN_ADJUST: "Yönetici düzenledi",
};

/** İki tarihin aynı takvim gününde olup olmadığı (günlük bonus için). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
