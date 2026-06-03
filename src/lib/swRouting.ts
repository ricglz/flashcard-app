export type ServiceWorkerRequestStrategy =
  | "cache-first"
  | "network-first"
  | "network-only"
  | "ignore";

type ServiceWorkerRequestLike = {
  method: string;
  url: string;
  mode?: string;
  headers: Pick<Headers, "get">;
};

function isHttpProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function isAppRouterRequest(request: ServiceWorkerRequestLike, url: URL) {
  return (
    request.mode === "navigate" ||
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") !== null
  );
}

export function getServiceWorkerRequestStrategy(
  request: ServiceWorkerRequestLike,
  serviceWorkerOrigin: string,
): ServiceWorkerRequestStrategy {
  if (request.method !== "GET") return "ignore";

  const url = new URL(request.url);
  if (!isHttpProtocol(url.protocol)) return "ignore";

  if (url.pathname.startsWith("/_next/static/")) {
    return "cache-first";
  }

  if (url.origin !== serviceWorkerOrigin) return "ignore";

  if (url.pathname.startsWith("/api/") || isAppRouterRequest(request, url)) {
    return "network-only";
  }

  return "network-first";
}
