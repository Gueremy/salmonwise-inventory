// Build injects the exact version and complete list of hashed JS/CSS assets.
const CACHE_NAME = self.__CACHE_VERSION || "salmotrack-shell-development";
const ASSETS_TO_CACHE = self.__PRECACHE_ASSETS || ["/", "/index.html", "/manifest.webmanifest", "/favicon.ico"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) =>
    key.startsWith("salmotrack-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin ||
      /^\/(api|auth|ws|health)(\/|$)/.test(url.pathname)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
      (await cache.match("/index.html")) || fetch(event.request)));
  } else if (ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
      (await cache.match(url.pathname)) || fetch(event.request)));
  }
});
