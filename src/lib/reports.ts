/** 🐺 Bozkurt Koruma: şikayet sebepleri (istemci + sunucu ortak). */

export type ReportTarget = "POST" | "COMMENT" | "USER";

export const REPORT_REASONS = [
  { key: "SPAM", label: "Spam / reklam" },
  { key: "KUFUR", label: "Küfür / hakaret" },
  { key: "CINSEL", label: "Cinsel içerik" },
  { key: "SIDDET", label: "Şiddet / tehlikeli" },
  { key: "TELIF", label: "Telif / kopya" },
  { key: "DIGER", label: "Diğer" },
] as const;

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  POST: "Video",
  COMMENT: "Yorum",
  USER: "Kullanıcı",
};
