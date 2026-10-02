// Vercel build sırasında veritabanını hazırlar:
//  - Şemayı uygular (prisma db push)
//  - Kurucu hesabı oluşturur (prisma/seed.mjs)
//
// Farklı Vercel/Neon entegrasyonları farklı değişken adları verdiği için
// birden çok kaynağı sırayla dener.
import { spawnSync } from "node:child_process";

function pick(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

// Uygulamanın çalışma anında kullanacağı (genelde pool'lu) bağlantı.
const appUrl = pick(
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL"
);

// Şema değişiklikleri için doğrudan (pool'suz) bağlantı tercih edilir.
const directUrl = pick(
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DIRECT_URL",
  appUrl
);

if (!appUrl) {
  console.error(
    "\n❌ DATABASE_URL bulunamadı. Vercel projesine bir Postgres veritabanı ekleyin " +
      "(Storage → Postgres/Neon). Entegrasyon DATABASE_URL'i otomatik ekler.\n"
  );
  // Build'i düşürmeyelim; site açılınca DB yapılandırması isteyecektir.
  process.exit(0);
}

console.log("→ Veritabanı şeması uygulanıyor (prisma db push)...");
const push = spawnSync(
  "npx",
  ["prisma", "db", "push", "--skip-generate"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directUrl },
    shell: process.platform === "win32",
  }
);

if (push.status !== 0) {
  console.error("❌ prisma db push başarısız oldu.");
  process.exit(push.status ?? 1);
}

console.log("→ Kurucu hesabı oluşturuluyor (seed)...");
const seed = spawnSync("node", ["prisma/seed.mjs"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: appUrl },
  shell: process.platform === "win32",
});

if (seed.status !== 0) {
  console.error("❌ seed başarısız oldu.");
  process.exit(seed.status ?? 1);
}

console.log("✓ Veritabanı hazır.");
