/* Taktik PWA servis çalışanı: kurulum ölçütünü karşılar, ağa dokunmaz.
   Önbelleğe alma yok — akış her zaman tazedir. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Boş fetch dinleyicisi: kurulabilirlik ölçütü için yeterli, isteklere karışmaz.
self.addEventListener("fetch", () => {});
