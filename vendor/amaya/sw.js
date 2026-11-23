/**
 * Service worker for the installable (PWA) build.
 *
 * Its job is to make the app work with no network at all, and to pick up a new
 * build or a new evidence snapshot the next time the app is opened — without a
 * store and without the user doing anything.
 *
 * Caching strategy, by resource class:
 *
 *   app shell (html/js/css/icons)  stale-while-revalidate, versioned by BUILD
 *   evidence data                   cache-first, versioned by DATA version
 *   update manifest                 always network-first, never cached
 *
 * The data is immutable for a given version, so it is served
 * from cache and only re-fetched when the app activates a newer snapshot. It is
 * precached at install, because a service worker cannot cache anything the page
 * fetched before it took control — see BUNDLED_DATA.
 */

const BUILD = "1.0.6-paths-bce0f781";
const DATA = "9c567745135f";
const BASE = "/amaya-imei-control-center";
const NS = "amaya-cc";

const SHELL_CACHE = `${NS}-shell-${BUILD}`;
const DATA_CACHE = `${NS}-data-${DATA}`;
const STATE_CACHE = `${NS}-state`;
const ACTIVE_MARKER = "/active-data";

/*
 * Which data cache to serve from. Starts as the snapshot bundled with this
 * build, and is switched at runtime when the page downloads and activates a
 * newer one. Mutable because the two are genuinely independent: the shell can
 * be years behind the evidence.
 */
let activeDataCache = DATA_CACHE;

async function readActiveDataCache() {
  try {
    const cache = await caches.open(STATE_CACHE);
    const res = await cache.match(ACTIVE_MARKER);
    if (!res) return DATA_CACHE;
    const name = (await res.text()).trim();
    if (!/^amaya-cc-data-[A-Za-z0-9_-]+$/.test(name)) return DATA_CACHE;
    const keys = await caches.keys();
    return keys.includes(name) ? name : DATA_CACHE;
  } catch {
    return DATA_CACHE;
  }
}

async function writeActiveDataCache(name) {
  try {
    const cache = await caches.open(STATE_CACHE);
    await cache.put(ACTIVE_MARKER, new Response(name));
  } catch (err) {
    console.warn("[sw] could not persist active data cache", err);
  }
}

/** Paths that make up the app shell, including the hashed app entry assets. */
const RAW_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/assets/index-7236c35e.js",
  "/assets/device-media.js",
  "/assets/index-P2bQqE--.css",
  "/assets/amaya-glass-58bed1277d.css",
  "/assets/amaya-glass-bce0f781.js",
  "/verify.html",
  "/assets/verify.css",
  "/assets/verify.js",
  "/verification/worklist.js",
  "/brand/amaya-rw.png",
  "/brand/amaya-rw-dark.png",
  // Vendored fonts. These have stable, unhashed filenames, so listing them is
  // safe: a font change is picked up because it changes BUILD, which names a new
  // shell cache. Without them here the app renders in system fonts offline,
  // which reads as a different app than the one installed.
  "/fonts/fonts.css",
  "/fonts/space-grotesk-400-latin.woff2",
  "/fonts/space-grotesk-500-latin.woff2",
  "/fonts/space-grotesk-600-latin.woff2",
  "/fonts/space-grotesk-700-latin.woff2",
  "/fonts/space-grotesk-400-latin-ext.woff2",
  "/fonts/space-grotesk-500-latin-ext.woff2",
  "/fonts/space-grotesk-600-latin-ext.woff2",
  "/fonts/space-grotesk-700-latin-ext.woff2",
  "/fonts/dm-mono-400-latin.woff2",
  "/fonts/dm-mono-500-latin.woff2",
  "/fonts/dm-mono-400-latin-ext.woff2",
  "/fonts/dm-mono-500-latin-ext.woff2",
];

const SHELL = RAW_SHELL.map((p) => BASE + p);

/**
 * The evidence snapshot bundled with this build, precached into the data cache.
 *
 * These are not in SHELL because they belong to the data cache, which is
 * versioned independently. They are precached rather than left to be cached
 * opportunistically because a service worker only intercepts requests made
 * *after* it takes control: on a first visit the page has already fetched the
 * ledger by the time the worker activates, so nothing gets cached and the app
 * cannot start without a network. That was not theoretical — with the self-hosted
 * server stopped, the shell rendered from cache while /data/meta.json failed and
 * the app showed an error instead of the ledger.
 *
 * It costs the bundled snapshot's size (~1.5 MB gzipped, ~7.8 MB raw on this
 * build) of install time and storage, which is the correct trade for a
 * tool whose whole point is running with no network.
 */
const BUNDLED_DATA = ["/data/meta.json", "/data/assets.json", "/data/events.json"].map((p) => BASE + p);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.all(
        SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );

      const data = await caches.open(DATA_CACHE);
      const addWithRetry = async (url) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await data.add(new Request(url, { cache: "reload" }));
            return true;
          } catch (err) {
            if (attempt === 2) {
              console.warn("[sw] could not precache evidence snapshot", url, err);
            } else {
              await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
            }
          }
        }
        return false;
      };
      const results = await Promise.all(BUNDLED_DATA.map(addWithRetry));
      if (results.some((ok) => !ok)) {
        throw new Error("evidence snapshot could not be precached; offline use will fail");
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      activeDataCache = await readActiveDataCache();
      await writeActiveDataCache(activeDataCache);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(NS + "-shell-") || k.startsWith(NS + "-data-"))
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE && k !== activeDataCache)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Ask open tabs whether new data is ready, so they can reload into it. */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) client.postMessage(message);
}

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "SKIP_WAITING") self.skipWaiting();

  if (msg.type === "ACTIVATE_DATA" && typeof msg.dataVersion === "string") {
    // The renderer has already written the new snapshot into its own cache.
    // Point every later request at it, then drop the superseded one.
    event.waitUntil(
      (async () => {
        activeDataCache = `${NS}-data-${msg.dataVersion}`;
        await writeActiveDataCache(activeDataCache);
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith(NS + "-data-") && k !== activeDataCache && k !== DATA_CACHE)
            .map((k) => caches.delete(k)),
        );
        await notifyClients({ type: "DATA_ACTIVATED", dataVersion: msg.dataVersion });
      })(),
    );
  }
});

function isDataRequest(url) {
  return url.pathname.startsWith(BASE + "/data/");
}

function isManifestRequest(url) {
  return url.pathname.startsWith(BASE + "/update/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const inScope = url.pathname === BASE || url.pathname.startsWith(BASE + "/");
  if (!inScope) return;

  const bypassCache = req.cache === "no-store" || /[?&](amaya|t|v|ts)=/.test(url.search);

  // Never cache the update manifest: a stale manifest means a missed update.
  if (isManifestRequest(url)) return;

  if (isDataRequest(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(activeDataCache);
        const hit = bypassCache ? undefined : await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && !bypassCache) {
          cache.put(req, res.clone()).catch((err) => {
            console.warn("[sw] could not cache evidence snapshot", req.url, err);
          });
        }
        return res;
      })(),
    );
    return;
  }

  // Navigations: network-first, falling back to the cached shell.
  //
  // The fallback has to trigger on an *error status*, not only on a thrown
  // error. A failed `fetch` is not the only way to fail: a captive portal, a
  // corporate proxy, a CDN edge error or a 503 during a deploy all answer with a
  // real 5xx response. Returning that unconditionally replaced the whole app with
  // a gateway error page, which defeats the point of precaching the shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(BASE + "/index.html", fresh.clone()).catch(() => undefined);
            return fresh;
          }
          // Non-OK: fall through to the cache, remembering the status in case
          // even the cache is unusable.
          const cache = await caches.open(SHELL_CACHE);
          const cached =
            (await cache.match(BASE + "/index.html")) || (await cache.match(BASE + "/"));
          if (cached) return cached;
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(BASE + "/index.html")) ||
            (await cache.match(BASE + "/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Everything else in the shell: serve fast, refresh in the background.
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      if (!bypassCache) {
        const hit = await cache.match(req);
        if (hit) {
          fetch(req)
            .then((res) => {
              if (res.ok && res.type === "basic") {
                cache.put(req, res.clone()).catch(() => undefined);
              }
            })
            .catch(() => undefined);
          return hit;
        }
      }
      const res = await fetch(req).catch(() => undefined);
      if (res && res.ok && res.type === "basic" && !bypassCache) {
        cache.put(req, res.clone()).catch((err) => {
          console.warn("[sw] could not refresh shell entry", req.url, err);
        });
      }
      return res || new Response("", { status: 504, statusText: "offline" });
    })(),
  );
});
