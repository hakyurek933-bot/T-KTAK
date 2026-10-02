import { PrismaClient } from "@prisma/client";

// Farklı Vercel/Neon entegrasyonları farklı değişken adları verir.
// Uygulamanın her durumda bağlanabilmesi için sırayla deniyoruz.
function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.NEON_DATABASE_URL,
  ];
  for (const url of candidates) {
    if (url && url.trim()) return url.trim();
  }
  return undefined;
}

export function hasDatabaseUrl() {
  return Boolean(resolveDatabaseUrl());
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
