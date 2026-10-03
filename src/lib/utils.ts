export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Canlı yayına katılma sistem mesajı (sohbette ortalanmış gösterilir). */
export const LIVE_JOIN_TEXT = "yayına katıldı 👋";

/** Coin ile öne çıkarma aktif mi? (saf fonksiyon, sunucu+istemcide kullanılır) */
export function isActivePromo(ts: Date | string | null | undefined): boolean {
  if (!ts) return false;
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts.getTime();
  return Number.isFinite(t) && t > nowMs();
}

function nowMs() {
  return Date.now();
}

/** "3 dk önce" tarzı Türkçe göreli zaman. */
export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "az önce";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} sa önce`;
  const day = Math.round(hour / 24);
  if (day < 7) return `${day} gün önce`;
  return d.toLocaleDateString("tr-TR");
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Avatar yoksa isim baş harflerinden renkli kutu için sabit bir renk üretir. */
export function colorFromString(str: string) {
  const colors = [
    "#fe2c55",
    "#25f4ee",
    "#7c3aed",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ec4899",
    "#ef4444",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export const ROLE_LABELS: Record<string, string> = {
  FOUNDER: "Kurucu",
  MOD: "Moderatör",
  USER: "Üye",
};

/** 1234 -> 1.2B, 1500000 -> 1.5Mn */
export function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "Mn";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "B";
  return String(n);
}
