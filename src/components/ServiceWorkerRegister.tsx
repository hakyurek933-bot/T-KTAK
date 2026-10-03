"use client";

import { useEffect } from "react";

/** PWA servis çalışanını kaydeder (sessiz, hata yoksayılır). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
