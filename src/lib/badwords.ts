/** 🐺 Bozkurt Koruma: küfür/hakaret filtresi.
 * Kelime sınırlarıyla eşleşir (masum kelimeleri engellemez),
 * Türkçe büyük/küçük harfe duyarsızdır. */

const BAD_WORDS = [
  "amk",
  "aq",
  "amq",
  "amcık",
  "sik",
  "siktir",
  "sktir",
  "yarrak",
  "yarak",
  "orospu",
  "orospi",
  "pezevenk",
  "pezo",
  "piç",
  "ibne",
  "göt",
  "kahpe",
  "kaltak",
  "puşt",
  "dallama",
  "yavşak",
  "sürtük",
  "fahişe",
  "embesil",
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PATTERNS = BAD_WORDS.map(
  (w) =>
    new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(w)}([^\\p{L}\\p{N}_]|$)`, "iu")
);

/** Metinde uygunsuz ifade var mı? */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const t = text.toLocaleLowerCase("tr-TR");
  return PATTERNS.some((re) => re.test(t));
}

export const PROFANITY_ERROR =
  "🐺 Bozkurt Koruma: uygunsuz ifade tespit edildi. Lütfen saygılı yaz.";
