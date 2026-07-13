const CACHE_PREFIX = "wmm-stable-launch-";
const STATIC_CACHE = `${CACHE_PREFIX}static-v23`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./stable-launch-service-worker.js",
  "./css/style.css",
  "./vendor/chart.umd.min.js",
  "./icons/stable/favicon-16.png",
  "./icons/stable/favicon-32.png",
  "./icons/stable/apple-touch-icon.png",
  "./icons/stable/icon-192.png",
  "./icons/stable/icon-512.png",
  "./icons/stable/maskable-192.png",
  "./icons/stable/maskable-512.png",
  "./js/core/config.js",
  "./js/domain/categories.js",
  "./js/data/storage.js",
  "./js/data/expense-store.js",
  "./js/domain/parser.js",
  "./js/domain/expense-actions.js",
  "./js/input/expense-submit-controller.js",
  "./js/input/expense-input-controller.js",
  "./js/input/input-bar-controller.js",
  "./js/domain/filters.js",
  "./js/domain/stats.js",
  "./js/domain/expense-query.js",
  "./js/core/app-refresh.js",
  "./js/ui/ui-utils.js",
  "./js/ui/download-controller.js",
  "./js/ui/header-title-controller.js",
  "./js/filters/filter-view.js",
  "./js/filters/filter-controller.js",
  "./js/timeline/timeline-view.js",
  "./js/timeline/timeline-controller.js",
  "./js/timeline/timeline-selection-controller.js",
  "./js/navigation/navigation-controller.js",
  "./js/stats/stats-view.js",
  "./js/stats/stats-charts.js",
  "./js/stats/stats-controller.js",
  "./js/modal/modal-view.js",
  "./js/modal/modal-form-controller.js",
  "./js/modal/modal-mobile-controller.js",
  "./js/modal/modal-interactions.js",
  "./js/modal/modal-controller.js",
  "./js/settings/settings-view.js",
  "./js/settings/settings-actions.js",
  "./js/settings/settings-controller.js",
  "./js/navigation/ui-stack.js",
  "./js/navigation/history-controller.js",
  "./js/navigation/ui-stack-effects.js",
  "./js/navigation/ui-stack-controller.js",
  "./js/ui/confirm-dialog.js",
  "./js/ui/confirm-controller.js",
  "./js/ui/theme-controller.js",
  "./js/ui/toast-controller.js",
  "./js/core/app-state.js",
  "./js/core/app-wiring-modal.js",
  "./js/core/app-wiring.js",
  "./js/core/app.js"
];

function isStableRequest(request) {
  const url = new URL(request.url);

  return (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    url.href.startsWith(self.registration.scope)
  );
}

async function readFromCacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => (
              cacheName.startsWith(CACHE_PREFIX) &&
              cacheName !== STATIC_CACHE
            ))
            .map((cacheName) => caches.delete(cacheName))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!isStableRequest(request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cachedIndex) => (
        cachedIndex || fetch(request)
      ))
    );
    return;
  }

  event.respondWith(readFromCacheFirst(request));
});
