import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { TEST_USER } from "./helpers";

const modules = import.meta.glob("../../convex/**/*.ts");

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

describe("userSettings.updateSrsSettings", () => {
  it("creates settings row on first update", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 10,
      dayResetUtcHour: 4,
      dailyGoal: 0,
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.maxNewCardsPerDay).toBe(10);
    expect(settings?.dayResetUtcHour).toBe(4);
  });

  it("rounds maxNewCardsPerDay to nearest integer", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 10.6,
      dayResetUtcHour: 4,
      dailyGoal: 0,
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.maxNewCardsPerDay).toBe(11);
  });

  it("rejects maxNewCardsPerDay outside the allowed range", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    expect(await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: -1,
      dayResetUtcHour: 4,
      dailyGoal: 0,
    })).toMatchObject({ ok: false, error: { message: "Max new cards per day must be 0-200" } });

    expect(await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 201,
      dayResetUtcHour: 4,
      dailyGoal: 0,
    })).toMatchObject({ ok: false, error: { message: "Max new cards per day must be 0-200" } });
  });

  it("saves dayResetUtcHour", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 20,
      dayResetUtcHour: 8,
      dailyGoal: 0,
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.dayResetUtcHour).toBe(8);
  });

  it("rejects hour > 23", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    expect(await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 20,
      dayResetUtcHour: 24,
      dailyGoal: 0,
    })).toMatchObject({ ok: false, error: { message: "Hour must be 0-23" } });
  });

  it("rejects negative hour", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    expect(await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 20,
      dayResetUtcHour: -1,
      dailyGoal: 0,
    })).toMatchObject({ ok: false, error: { message: "Hour must be 0-23" } });
  });

  it("rounds fractional hour to nearest integer", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 20,
      dayResetUtcHour: 4.7,
      dailyGoal: 0,
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.dayResetUtcHour).toBe(5);
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    expect(await t.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 10,
      dayResetUtcHour: 4,
      dailyGoal: 0,
    })).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("does not overwrite AI config fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test",
    });
    await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 15,
      dayResetUtcHour: 6,
      dailyGoal: 0,
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.maxNewCardsPerDay).toBe(15);
    expect(settings?.hasLlmKey).toBe(true);
    expect(settings?.llmProvider).toBe("openai");
  });
});

describe("userSettings.updateTtsPlaybackSpeed", () => {
  it("saves ttsPlaybackSpeed", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateTtsPlaybackSpeed, { ttsPlaybackSpeed: 1.5 });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.ttsPlaybackSpeed).toBe(1.5);
  });

  it("rejects ttsPlaybackSpeed below 0.25", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    expect(await as.mutation(api.userSettings.updateTtsPlaybackSpeed, { ttsPlaybackSpeed: 0.1 })).toMatchObject({ ok: false, error: { message: "Speed must be 0.25-2.0" } });
  });

  it("rejects ttsPlaybackSpeed above 2.0", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    expect(await as.mutation(api.userSettings.updateTtsPlaybackSpeed, { ttsPlaybackSpeed: 3.0 })).toMatchObject({ ok: false, error: { message: "Speed must be 0.25-2.0" } });
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    expect(await t.mutation(api.userSettings.updateTtsPlaybackSpeed, { ttsPlaybackSpeed: 1.0 })).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });
});

describe("userSettings.updateAiConfig", () => {
  it("saves provider and API key", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test-key",
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.hasLlmKey).toBe(true);
    expect(settings?.llmProvider).toBe("openai");
  });

  it("keeps existing key when apiKey is empty string", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-original",
    });
    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "anthropic",
      apiKey: "",
      customChatPrompt: "New prompt",
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.llmProvider).toBe("anthropic");
    expect(settings?.hasLlmKey).toBe(true);
    expect(settings?.customChatPrompt).toBe("New prompt");
  });

  it("does not overwrite SRS fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, {
      maxNewCardsPerDay: 15,
      dayResetUtcHour: 8,
      dailyGoal: 50,
    });
    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test",
    });

    const settings = await as.query(api.userSettings.get);
    expect(settings?.maxNewCardsPerDay).toBe(15);
    expect(settings?.dayResetUtcHour).toBe(8);
    expect(settings?.hasLlmKey).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    expect(await t.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test",
    })).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });
});
