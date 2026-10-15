// Kreedex service worker.
// Keep APP and MODELS in sync with src/offline.js.
// Change the number at the end (v1 -> v2) to force every phone to re-download that cache.
const APP = "kreedex-app-v1";
const MODELS = "kreedex-models-v1";
const BIG = ["/models/", "/wasm/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP)
      .then((c) => c.addAll(["/", "/manifest.webmanifest"]))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== APP && k !== MODELS).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

// Try the network first, but fall back to the saved copy after 3.5 seconds
// (or straight away when offline), so weak connections do not hang the app.
async function networkFirst(request, key) {
  const cache = await caches.open(APP);
  const net = fetch(request);
  try {
    const res = await withTimeout(net, 3500);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch {
    const hit = await cache.match(key);
    if (hit) return hit;
    return net;
  }
}

// Saved copy first. Files under /assets/ have a hash in their name, so they never change.
async function cacheFirst(request, url) {
  const big = BIG.some((p) => url.pathname.startsWith(p));
  const cache = await caches.open(big ? MODELS : APP);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }
  if (url.pathname === "/offline-files.json") {
    event.respondWith(networkFirst(request, request));
    return;
  }
  event.respondWith(cacheFirst(request, url));
});