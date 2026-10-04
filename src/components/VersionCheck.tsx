"use client";

import { useEffect, useRef, useState } from "react";

/** Tak-tak güncelleme: yeni deploy yayına girince...
 *  - Sekme gizliyse: anında otomatik yeniler.
 *  - Güvenli sayfadaysa (akış/keşfet/vitrin): 30 sn sonra otomatik yeniler.
 *  - Yayında/yüklemede/mesajlaşırken: sadece hap çıkar, kullanıcı dokunur.
 */
const AUTO_DELAY_MS = 30000;
const SAFE_PREFIXES = [
  "/discover",
  "/leaderboard",
  "/search",
  "/saved",
  "/notifications",
  "/settings",
  "/admin",
];

export function VersionCheck({ initialSha }: { initialSha: string }) {
  const [update, setUpdate] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!initialSha || initialSha === "local") return;
    let active = true;

    function scheduleAuto() {
      if (!active || timer.current) return;
      const path = window.location.pathname;
      const safePage =
        path === "/" || SAFE_PREFIXES.some((p) => path.startsWith(p));
      if (document.hidden) {
        window.location.reload();
        return;
      }
      if (safePage) {
        setCountdown(Math.round(AUTO_DELAY_MS / 1000));
        timer.current = setTimeout(() => {
          window.location.reload();
        }, AUTO_DELAY_MS);
      }
    }

    function onVisible() {
      // Hap çıkmışken sekme gizlenirse hemen yenile.
      if (document.hidden) window.location.reload();
    }

    const interval = setInterval(async () => {
      if (!active || timer.current) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sha?: string };
        if (data.sha && data.sha !== "local" && data.sha !== initialSha) {
          if (!active) return;
          setUpdate(true);
          scheduleAuto();
        }
      } catch {
        /* sessizce yoksay */
      }
    }, 90000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [initialSha]);

  // Geri sayım göstergesi.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : c)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!update) return null;

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-sm font-bold text-white shadow-2xl active:scale-95 md:bottom-8"
    >
      🎉 Yeni sürüm yayında!{" "}
      {countdown !== null ? `(${countdown} sn)` : "Yenile"}
    </button>
  );
}
