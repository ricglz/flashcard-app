/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const TEST_USER = {
  tokenIdentifier: "test-user-1",
  subject: "user1",
};

describe("userSettings.get", () => {
  it("returns defaults when no settings exist", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const settings = await as.query(api.userSettings.get);
    expect(settings).toMatchObject({
      maxNewCardsPerDay: 20,
      dayResetUtcHour: 4,
      ttsPlaybackSpeed: 0.75,
    });
  });

  it("returns null for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const settings = await t.query(api.userSettings.get);
    expect(settings).toBeNull();
  });
});

describe("userSettings.update", () => {
  it("creates settings row on first update", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.update, { maxNewCardsPerDay: 10 });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.maxNewCardsPerDay).toBe(10);
    expect(settings?.dayResetUtcHour).toBe(4);
  });

  it("saves dayResetUtcHour", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.update, { dayResetUtcHour: 8 });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.dayResetUtcHour).toBe(8);
  });

  it("partial update does not overwrite other fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.update, {
      maxNewCardsPerDay: 15,
      dayResetUtcHour: 6,
    });
    await as.mutation(api.userSettings.update, { dayResetUtcHour: 10 });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.maxNewCardsPerDay).toBe(15);
    expect(settings?.dayResetUtcHour).toBe(10);
  });

  it("rejects hour > 23", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await expect(
      as.mutation(api.userSettings.update, { dayResetUtcHour: 24 })
    ).rejects.toThrow("Hour must be 0-23");
  });

  it("rejects negative hour", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await expect(
      as.mutation(api.userSettings.update, { dayResetUtcHour: -1 })
    ).rejects.toThrow("Hour must be 0-23");
  });

  it("rounds fractional hour to nearest integer", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.update, { dayResetUtcHour: 4.7 });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.dayResetUtcHour).toBe(5);
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.userSettings.update, { maxNewCardsPerDay: 10 })
    ).rejects.toThrow("Not authenticated");
  });

  it("saves ttsPlaybackSpeed", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.update, { ttsPlaybackSpeed: 1.5 });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.ttsPlaybackSpeed).toBe(1.5);
  });

  it("rejects ttsPlaybackSpeed below 0.25", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await expect(
      as.mutation(api.userSettings.update, { ttsPlaybackSpeed: 0.1 })
    ).rejects.toThrow("Speed must be 0.25-2.0");
  });

  it("rejects ttsPlaybackSpeed above 2.0", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await expect(
      as.mutation(api.userSettings.update, { ttsPlaybackSpeed: 3.0 })
    ).rejects.toThrow("Speed must be 0.25-2.0");
  });
});
