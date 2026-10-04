"use client";

import { useEffect, useState } from "react";

/** Yeni deploy yayına girince "Yenile" hapı çıkarır (tak-tak güncelleme). */
export function VersionCheck({ initialSha }: { initialSha: string }) {
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    if (!initialSha || initialSha === "local") return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sha?: string };
        if (active && data.sha && data.sha !== "local" && data.sha !== initialSha) {
          setUpdate(true);
        }
      } catch {
        /* sessizce yoksay */
      }
    }, 90000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [initialSha]);

  if (!update) return null;

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-sm font-bold text-white shadow-2xl active:scale-95 md:bottom-8"
    >
      🎉 Yeni sürüm yayında! Yenile
    </button>
  );
}
