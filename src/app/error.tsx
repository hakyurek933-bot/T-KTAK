"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sayfa hatası:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-5xl">🛠️</p>
      <h1 className="mt-3 text-xl font-bold">Bir şeyler ters gitti</h1>
      <p className="mt-2 text-sm text-muted">
        Sunucu bu sayfayı oluştururken hata verdi. En sık sebep veritabanı
        bağlantısının eksik olmasıdır.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted">Hata kodu: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
        >
          Tekrar dene
        </button>
        <Link
          href="/api/health"
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold"
        >
          Durumu kontrol et
        </Link>
      </div>
    </div>
  );
}
