import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { parseUrlState, serializeUrlState, useUrlState, zEnum } from "./useUrlState";

const mockReplace = vi.fn();
const mockPush = vi.fn();
let mockSearchParamsValue = new URLSearchParams();
const mockPathname = "/test";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsValue.get(key),
    toString: () => mockSearchParamsValue.toString(),
  }),
  usePathname: () => mockPathname,
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

describe("parseUrlState", () => {
  it("parses valid value", () => {
    const schema = z.enum(["updated", "created", "name"]);
    expect(parseUrlState("created", schema, "updated")).toBe("created");
  });

  it("falls back to default on invalid", () => {
    const schema = z.enum(["updated", "created", "name"]);
    expect(parseUrlState("foo", schema, "updated")).toBe("updated");
  });

  it("falls back to default on null", () => {
    const schema = z.enum(["updated", "created", "name"]);
    expect(parseUrlState(null, schema, "updated")).toBe("updated");
  });
});

describe("serializeUrlState", () => {
  it("serializes primitives", () => {
    expect(serializeUrlState("name")).toBe("name");
    expect(serializeUrlState(42)).toBe("42");
  });

  it("uses custom serializer", () => {
    expect(serializeUrlState({ a: 1 }, JSON.stringify)).toBe('{"a":1}');
  });
});

describe("useUrlState", () => {
  beforeEach(() => {
    mockSearchParamsValue = new URLSearchParams();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  it("reads default when param absent", () => {
    const { result } = renderHook(() =>
      useUrlState("sort", zEnum(["updated", "created", "name"] as const), "updated"),
    );
    expect(result.current[0]).toBe("updated");
  });

  it("reads valid param", () => {
    mockSearchParamsValue = new URLSearchParams("sort=created");
    const { result } = renderHook(() =>
      useUrlState("sort", zEnum(["updated", "created", "name"] as const), "updated"),
    );
    expect(result.current[0]).toBe("created");
  });

  it("falls back on invalid param", () => {
    mockSearchParamsValue = new URLSearchParams("sort=foo");
    const { result } = renderHook(() =>
      useUrlState("sort", zEnum(["updated", "created", "name"] as const), "updated"),
    );
    expect(result.current[0]).toBe("updated");
  });

  it("deletes param on default value", () => {
    mockSearchParamsValue = new URLSearchParams("sort=created");
    const { result } = renderHook(() =>
      useUrlState("sort", zEnum(["updated", "created", "name"] as const), "updated"),
    );
    act(() => {
      result.current[1]("updated");
    });
    expect(mockReplace).toHaveBeenCalledWith("/test", { scroll: false });
  });

  it("sets param on non-default", () => {
    const { result } = renderHook(() =>
      useUrlState("sort", zEnum(["updated", "created", "name"] as const), "updated"),
    );
    act(() => {
      result.current[1]("name");
    });
    expect(mockReplace).toHaveBeenCalledWith("/test?sort=name", { scroll: false });
  });

  it("supports functional updater", () => {
    mockSearchParamsValue = new URLSearchParams("sort=created");
    const { result } = renderHook(() =>
      useUrlState("sort", zEnum(["updated", "created", "name"] as const), "updated"),
    );
    act(() => {
      result.current[1]((prev) => (prev === "created" ? "name" : "created"));
    });
    expect(mockReplace).toHaveBeenCalledWith("/test?sort=name", { scroll: false });
  });
});
