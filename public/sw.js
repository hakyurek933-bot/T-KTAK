/* PWA kaldırıldı: bu dosya eski servis çalışanlarını temizleyip
   kendini kaldırır. Telefonlar siteyi normal şekilde açar. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});
