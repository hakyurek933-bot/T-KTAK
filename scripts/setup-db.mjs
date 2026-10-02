// Vercel build sırasında veritabanını hazırlar:
//  - Şemayı uygular (prisma db push)
//  - Kurucu hesabı oluşturur (prisma/seed.mjs)
//
// ÖNEMLİ: Bu betik ASLA build'i durdurmaz (her zaman exit 0).
// Veritabanı bağlı değilse uyarır ama `next build` yine de çalışır.
// Böylece "Routes Manifest Could Not Be Found" hatası oluşmaz.
import { spawnSync } from "node:child_process";

function pick(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

const appUrl = pick(
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL"
);

const directUrl = pick(
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DIRECT_URL",
  appUrl
);

if (!appUrl) {
  console.warn(
    "\n⚠ DATABASE_URL bulunamadı. Vercel projesine bir Postgres veritabanı ekleyin " +
      "(Storage → Postgres/Neon). Site deploy olur ama veritabanı işlemleri çalışmaz.\n"
  );
  process.exit(0);
}

function run(label, cmd, args, url) {
  try {
    console.log(`→ ${label}`);
    const res = spawnSync(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
      shell: process.platform === "win32",
    });
    if (res.status !== 0) {
      console.warn(`⚠ ${label} başarısız oldu (kod ${res.status}). Build devam ediyor.`);
    }
    return res.status === 0;
  } catch (err) {
    console.warn(`⚠ ${label} hata verdi:`, err?.message ?? err);
    return false;
  }
}

run("Veritabanı şeması uygulanıyor (prisma db push)", "npx", [
  "prisma",
  "db",
  "push",
  "--skip-generate",
], directUrl);

if (directUrl === appUrl && /pooler|pgbouncer=true/i.test(appUrl)) {
  console.warn(
    "⚠ Bağlantı havuzlu (pooler) görünüyor. Şema kurulumu için havuzsuz " +
      "bağlantıyı DATABASE_URL_UNPOOLED olarak tanımlayın."
  );
}

run("Kurucu hesabı oluşturuluyor (seed)", "node", ["prisma/seed.mjs"], appUrl);

console.log("✓ Veritabanı kurulum adımı tamamlandı (hatalar build'i durdurmaz).");
process.exit(0);
