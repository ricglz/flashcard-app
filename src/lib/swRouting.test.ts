import { describe, expect, it } from "vitest";
import { getServiceWorkerRequestStrategy } from "./swRouting";

const ORIGIN = "https://flashcards.example";

function request(
  path: string,
  {
    method = "GET",
    mode,
    headers,
  }: {
    method?: string;
    mode?: string;
    headers?: HeadersInit;
  } = {},
) {
  return {
    method,
    mode,
    url: new URL(path, ORIGIN).toString(),
    headers: new Headers(headers),
  };
}

describe("getServiceWorkerRequestStrategy", () => {
  it("uses cache-first for Next static assets", () => {
    expect(
      getServiceWorkerRequestStrategy(
        request("/_next/static/chunks/app.js"),
        ORIGIN,
      ),
    ).toBe("cache-first");
  });

  it("bypasses runtime cache for navigation requests", () => {
    expect(
      getServiceWorkerRequestStrategy(
        request("/srs", { mode: "navigate" }),
        ORIGIN,
      ),
    ).toBe("network-only");
  });

  it("bypasses runtime cache for _rsc requests", () => {
    expect(
      getServiceWorkerRequestStrategy(request("/srs?_rsc=abc"), ORIGIN),
    ).toBe("network-only");
  });

  it("bypasses runtime cache for RSC requests", () => {
    expect(
      getServiceWorkerRequestStrategy(
        request("/srs", { headers: { RSC: "1" } }),
        ORIGIN,
      ),
    ).toBe("network-only");
  });

  it("bypasses runtime cache for Next router prefetch requests", () => {
    expect(
      getServiceWorkerRequestStrategy(
        request("/srs", { headers: { "Next-Router-Prefetch": "1" } }),
        ORIGIN,
      ),
    ).toBe("network-only");
  });

  it("bypasses runtime cache for API routes", () => {
    expect(
      getServiceWorkerRequestStrategy(request("/api/chat"), ORIGIN),
    ).toBe("network-only");
  });
});
