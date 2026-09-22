// Makes the app work with NO internet connection after it's been opened
// once. It caches the app's own files (HTML/CSS/JS/icons) — it deliberately
// never caches /api/... calls, since survey data always needs a real,
// current answer from the server (the app's own code already handles a
// failed API call gracefully — see app.js's sync functions).

var CACHE_NAME = "ves-app-shell-v1";
var APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // Only handle our own GET requests for the app shell — never touch
  // cross-origin requests or the /api/ data endpoints.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        // Offline and not cached (shouldn't normally happen for shell files) —
        // fall back to the cached start page so the app still opens.
        return cached || caches.match("./index.html");
      });
      // Serve from cache instantly if we have it, refresh it in the background;
      // otherwise wait for the network.
      return cached || networkFetch;
    })
  );
});
