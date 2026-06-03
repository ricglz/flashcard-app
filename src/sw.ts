/// <reference lib="webworker" />

import { getServiceWorkerRequestStrategy } from "./lib/swRouting";

export type {};

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string }>;
};

const PRECACHE_NAME = "precache-v1";
const RUNTIME_NAME = "runtime-v1";
const CACHE_NAMES = [PRECACHE_NAME, RUNTIME_NAME];

self.addEventListener("install", (event: ExtendableEvent) => {
  self.skipWaiting();
  const manifest = self.__SW_MANIFEST;
  if (!manifest?.length) return;
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) =>
      Promise.all(
        manifest.map(({ url }) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {
            // Non-critical; some assets may not exist at install time.
          }),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !CACHE_NAMES.includes(n))
          .map((n) => caches.delete(n)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const strategy = getServiceWorkerRequestStrategy(
    request,
    self.location.origin,
  );

  switch (strategy) {
    case "cache-first":
      event.respondWith(cacheFirst(request));
      return;
    case "network-first":
      event.respondWith(
        networkFirst(request, (promise) => event.waitUntil(promise)),
      );
      return;
    case "network-only":
      event.respondWith(fetch(request));
      return;
    case "ignore":
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

async function putRuntimeCache(request: Request, response: Response) {
  const cache = await caches.open(RUNTIME_NAME);
  await cache.put(request, response);
}

async function networkFirst(
  request: Request,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      waitUntil(putRuntimeCache(request, response.clone()));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}
