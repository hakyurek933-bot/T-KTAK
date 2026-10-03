/** Doğum tarihinden yaş hesaplar. Tarih yoksa/geçersizse null döner. */
export function getAge(
  birthdate: Date | string | null | undefined
): number | null {
  if (!birthdate) return null;
  const d = typeof birthdate === "string" ? new Date(birthdate) : birthdate;
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Canlı yayın açmak için gereken yaş sınırı. */
export const LIVE_MIN_AGE = 15;
