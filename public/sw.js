const CACHE_NAME = "fasttv-cache-v1";
const OFFLINE_URL = "/offline.html";

// 1. Eng muhim fayllar (Bular doim telefonda saqlanadi)
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  OFFLINE_URL,
];

// 2. O'RNATISH (Install) - Sayt birinchi marta ochilganda ishlaydi
self.addEventListener("install", (event) => {
  console.log("[SW] O'rnatilmoqda...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Asosiy fayllar keshlanmoqda");
      return cache.addAll(APP_SHELL);
    }),
  );
  // Darhol faollashtirish
  self.skipWaiting();
});

// 3. FAOLLASHTIRISH (Activate) - Eski keshni tozalaydi
self.addEventListener("activate", (event) => {
  console.log("[SW] Faollashdi");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[SW] Eski kesh tozalandi:", cache);
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// 4. SO'ROVLARNI USHLASH (Fetch) - Eng aqlli qismi
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // A. Agar so'rov Supabase API ga (Kanallar ro'yxati) ketsa: Network First
  if (url.origin.includes("supabase.co")) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // Javobni keshga saqlab qo'yamiz (oflayn uchun)
          const clonedRes = networkRes.clone();
          caches
            .open("fasttv-api-cache")
            .then((cache) => cache.put(req, clonedRes));
          return networkRes;
        })
        .catch(async () => {
          // Internet yo'q bo'lsa, keshdagi oxirgi kanallarni beramiz
          const cachedRes = await caches.match(req);
          return (
            cachedRes ||
            new Response(JSON.stringify([]), {
              headers: { "Content-Type": "application/json" },
            })
          );
        }),
    );
    return;
  }

  // B. Rasm yoki Media fayllar uchun: Cache First (Tezlik uchun)
  if (req.destination === "image" || req.destination === "video") {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        return (
          cachedRes ||
          fetch(req).then((networkRes) => {
            const clonedRes = networkRes.clone();
            caches
              .open("fasttv-media-cache")
              .then((cache) => cache.put(req, clonedRes));
            return networkRes;
          })
        );
      }),
    );
    return;
  }

  // C. Asosiy sahifa va boshqa fayllar: Tarmoq, yo'q bo'lsa Kesh, yo'q bo'lsa Oflayn sahifa
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, networkRes.clone());
          return networkRes;
        });
      })
      .catch(async () => {
        const cachedRes = await caches.match(req);
        if (cachedRes) return cachedRes;

        // Agar hech narsa topilmasa va so'rov HTML bo'lsa, Oflayn sahifani ko'rsat
        if (req.headers.get("accept").includes("text/html")) {
          return caches.match(OFFLINE_URL);
        }
      }),
  );
});
