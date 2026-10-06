// Vercel build sırasında veritabanını hazırlar:
//  - Şemayı uygular (prisma db push)
//  - Kurucu hesabı oluşturur (prisma/seed.mjs)
//
// Davranış:
//  - Veritabanı bağlı DEĞİLSE: uyarır ama build'i durdurmaz (exit 0).
//    Böylece ilk kurulumda "Routes Manifest Could Not Be Found" oluşmaz.
//  - Veritabanı bağlıysa AMA şema/seed başarısızsa: build'i BİLEREK
//    düşürür (exit 1). Sessiz geçilirse prod DB eski şemayla kalır ve
//    tüm site 500 verir — asıl felaket budur.
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

function sleepSync(ms) {
  // Neon soğuk başlatması için bekleme (taşınabilir, harici komut yok).
  try {
    spawnSync(
      process.execPath,
      ["-e", `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${ms});`],
      { stdio: "ignore" }
    );
  } catch {
    /* yoksay */
  }
}

function run(label, cmd, args, url, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`→ ${label} (deneme ${attempt}/${retries + 1})`);
      const res = spawnSync(cmd, args, {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: url },
        shell: process.platform === "win32",
      });
      if (res.status === 0) return true;
      console.error(`\n❌❌❌ ${label} BAŞARISIZ OLDU (kod ${res.status}).`);
      if (attempt <= retries) {
        console.log("Tekrar denenecek (15 sn bekleniyor, Neon uyanıyor olabilir)...");
        sleepSync(15000);
        continue;
      }
      console.error(
        "Veritabanı bağlı ama şema uygulanamadı. Deploy durduruluyor — " +
          "yoksa site eski şemayla 500 verir.\n"
      );
      process.exit(res.status ?? 1);
    } catch (err) {
      console.error(`\n❌❌❌ ${label} hata verdi:`, err?.message ?? err);
      if (attempt <= retries) {
        sleepSync(15000);
        continue;
      }
      process.exit(1);
    }
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

console.log("✓ Veritabanı kurulum adımı tamamlandı.");
process.exit(0);
