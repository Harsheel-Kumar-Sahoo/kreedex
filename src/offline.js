// Keep these names in sync with public/sw.js
export const APP_CACHE = "kreedex-app-v1";
export const MODEL_CACHE = "kreedex-models-v1";

export const offlineSupported = () =>
  "serviceWorker" in navigator && "caches" in window && import.meta.env.PROD;

// Resolves to the service worker registration, or null if none becomes active in time.
function swReady(ms) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function readList() {
  try {
    const r = await fetch("/offline-files.json", { cache: "no-store" });
    if (r.ok) return await r.json();
  } catch {
    /* offline: fall back to the saved copy */
  }
  const hit = await caches.match("/offline-files.json");
  return hit ? await hit.json() : null;
}

// state: "dev" | "no-sw" | "unknown" | "not-ready" | "ready"
export async function getOfflineStatus() {
  if (!offlineSupported()) return { state: "dev" };
  try {
    const reg = await swReady(4000);
    if (!reg) return { state: "no-sw" };

    const info = await readList();
    if (!info || !info.files || info.files.length === 0) return { state: "unknown" };

    const models = await caches.open(MODEL_CACHE);
    const saved = (await models.keys()).map((r) => new URL(r.url).pathname);
    const have = info.files.filter((f) => saved.includes(f)).length;

    const app = await caches.open(APP_CACHE);
    const shell = !!(await app.match("/"));

    return {
      state: shell && have === info.files.length ? "ready" : "not-ready",
      have,
      total: info.files.length,
      mb: Math.max(1, Math.round((info.totalBytes || 0) / 1048576)),
    };
  } catch {
    return { state: "unknown" };
  }
}

// Downloads the app files and the pose model into the cache.
export async function prepareOffline(onProgress) {
  const reg = await swReady(8000);
  if (!reg) throw new Error("no-sw");

  const info = await readList();
  if (!info || !info.files || info.files.length === 0) throw new Error("no-list");

  const app = await caches.open(APP_CACHE);
  const models = await caches.open(MODEL_CACHE);

  // App shell: the page, manifest, icons, and every file this page has loaded.
  const shell = new Set([
    "/",
    "/manifest.webmanifest",
    "/offline-files.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
  ]);
  for (const e of performance.getEntriesByType("resource")) {
    const u = new URL(e.name);
    if (u.origin !== location.origin) continue;
    if (u.pathname.startsWith("/models/") || u.pathname.startsWith("/wasm/")) continue;
    shell.add(u.pathname);
  }

  const jobs = [
    ...[...shell].map((path) => ({ cache: app, path, required: false })),
    ...info.files.map((path) => ({ cache: models, path, required: true })),
  ];

  let done = 0;
  if (onProgress) onProgress(0, jobs.length);

  for (const job of jobs) {
    const already = await job.cache.match(job.path);
    if (!already) {
      try {
        const res = await fetch(job.path, { cache: "no-store" });
        if (res.ok) {
          await job.cache.put(job.path, res);
        } else if (job.required) {
          throw new Error("fetch failed: " + job.path);
        }
      } catch (e) {
        if (job.required) throw e;
      }
    }
    done++;
    if (onProgress) onProgress(done, jobs.length);
  }

  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch {
    /* not critical */
  }
}