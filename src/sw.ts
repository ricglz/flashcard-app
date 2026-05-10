/// <reference lib="webworker" />

export type {};

const sw = globalThis as unknown as ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string }>;
};

const PRECACHE_NAME = "precache-v1";
const RUNTIME_NAME = "runtime-v1";

sw.addEventListener("install", (event: ExtendableEvent) => {
  sw.skipWaiting();
  const manifest = sw.__SW_MANIFEST;
  if (!manifest?.length) return;
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) =>
      Promise.all(
        manifest.map(({ url }) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {
            // Non-critical — some assets may not exist at install time
          }),
        ),
      ),
    ),
  );
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== PRECACHE_NAME && n !== RUNTIME_NAME)
          .map((n) => caches.delete(n)),
      ),
    ),
  );
  sw.clients.claim();
});

sw.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!url.protocol.startsWith("http")) return;

  // Cache-first for hashed static assets (immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for same-origin navigations and other requests
  if (url.origin === sw.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(PRECACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}
