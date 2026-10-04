/*
 * PrepOS service worker. Keeps it deliberately small:
 * - build assets and icons: cache-first (file names are content-hashed or versioned here)
 * - page navigations: always network; if offline, show /offline
 * - signed-in HTML and data are never cached (they're personal and change constantly)
 */
const VERSION = "v1";
const STATIC_CACHE = `prepos-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("prepos-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/*
 * Push: the server sends { title, body, tag, url, actions, actionUrls } (lib/domain/push-payload.ts).
 * Tapping opens the full message; an action button opens its own path. An open PrepOS window is
 * reused instead of opening a new one.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "PrepOS";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || "prepos",
      renotify: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
      data: { url: data.url || "/dashboard", actionUrls: data.actionUrls || {} },
      timestamp: Date.now(),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url = "/dashboard", actionUrls = {} } = event.notification.data || {};
  const path = (event.action && actionUrls[event.action]) || url;
  const target = new URL(path, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === target.origin);
      if (open) return open.focus().then((w) => (w ? w.navigate(target.href) : self.clients.openWindow(target.href)));
      return self.clients.openWindow(target.href);
    }),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
  }
});
