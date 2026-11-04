/* CodeSense AI service worker (makes the app installable and keeps the UI usable offline).
 * Never touches /api/. Pages: network first, falling back to the last cached copy.
 * Hashed build files, images and icons: cache first (their names change when content changes). */
const CACHE = "codesense-v1";
const OFFLINE_FALLBACKS = ["/app", "/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/favicon.svg", "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Page navigations: always try the network first so a new deploy shows up immediately.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req);
          if (hit) return hit;
          for (const p of OFFLINE_FALLBACKS) {
            const fb = await caches.match(p);
            if (fb) return fb;
          }
          return new Response("You are offline. Reconnect and try again.", { status: 503, headers: { "content-type": "text/plain" } });
        }),
    );
    return;
  }

  // Static files: cache first, then network (and remember it).
  if (/^\/(assets|img|icons)\//.test(url.pathname) || /\.(svg|webp|png|woff2?|css|js)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      })),
    );
  }
});
