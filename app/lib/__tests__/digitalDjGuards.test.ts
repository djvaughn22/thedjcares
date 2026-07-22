// Guard-rail tests for Digital DJ: prove that blocked, AI-disabled, and
// unconfigured requests never reach OpenAI; that the rate limiter enforces
// burst + daily quotas; that tampered share ids resolve safely; and that the
// API route enforces everything server-side.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { anonymousKey, checkRateLimit, resetRateLimitStore } from "../digitalDjRateLimit";
import { parseUserIntentWithAi, sanitizeIntent, validateInput, MAX_INPUT_CHARS } from "../digitalDjAiParser";
import { selectMediaForDj, shareableIdsToItems, MAX_SHARED_IDS } from "../digitalDjSelector";
import { LIBRARY } from "../djCaresLibrary";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  resetRateLimitStore();
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// A fetch stub that fails the test if anything tries the network.
const armNetworkTripwire = () => {
  const tripwire = vi.fn(() => {
    throw new Error("network call attempted");
  });
  vi.stubGlobal("fetch", tripwire);
  return tripwire;
};

describe("AI no-call guarantees", () => {
  it("never calls the network when AI is disabled", async () => {
    process.env.DIGITAL_DJ_AI_ENABLED = "false";
    process.env.OPENAI_API_KEY = "test-key-should-not-be-used";
    const tripwire = armNetworkTripwire();
    const result = await parseUserIntentWithAi("ten minutes of peace");
    expect(result).toBeNull();
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("never calls the network when the API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const tripwire = armNetworkTripwire();
    const result = await parseUserIntentWithAi("ten minutes of peace");
    expect(result).toBeNull();
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("never calls the network for oversized input", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const tripwire = armNetworkTripwire();
    const result = await parseUserIntentWithAi("x".repeat(MAX_INPUT_CHARS + 1));
    expect(result).toBeNull();
    expect(tripwire).not.toHaveBeenCalled();
  });
});

describe("input validation", () => {
  it("accepts normal text", () => {
    expect(validateInput("thirty minutes of hymns")).toBe(true);
  });
  it("rejects empty, non-string, and oversized input", () => {
    expect(validateInput("")).toBe(false);
    expect(validateInput("   ")).toBe(false);
    expect(validateInput(42)).toBe(false);
    expect(validateInput(null)).toBe(false);
    expect(validateInput("x".repeat(MAX_INPUT_CHARS + 1))).toBe(false);
  });
});

describe("sanitizeIntent whitelist", () => {
  it("drops URLs, media ids, and unknown fields the model might smuggle", () => {
    const result = sanitizeIntent({
      durationMinutes: 10,
      url: "https://evil.example",
      mediaIds: ["bad-id"],
      recommendation: "watch this channel",
      needs: ["peace", "not-a-need"],
    });
    expect(result).toEqual({ durationMinutes: 10, needs: ["peace"] });
    expect(JSON.stringify(result)).not.toContain("evil");
  });

  it("rejects off-list durations and media types", () => {
    expect(sanitizeIntent({ durationMinutes: 17 })).toBeNull();
    expect(sanitizeIntent({ mediaTypes: ["tiktok"] })).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(sanitizeIntent(null)).toBeNull();
    expect(sanitizeIntent("string")).toBeNull();
    expect(sanitizeIntent({})).toBeNull();
  });
});

describe("rate limiter", () => {
  it("hashes visitor keys — raw IP never appears", () => {
    const key = anonymousKey("203.0.113.7, 10.0.0.1");
    expect(key).not.toContain("203.0.113.7");
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    // Same IP → same key; different IP → different key.
    expect(anonymousKey("203.0.113.7")).toBe(key);
    expect(anonymousKey("203.0.113.8")).not.toBe(key);
  });

  it("enforces the burst limit within a minute", () => {
    const key = anonymousKey("198.51.100.1");
    const t0 = Date.now();
    for (let i = 0; i < 4; i++) {
      expect(checkRateLimit(key, t0 + i * 1000).allowed).toBe(true);
    }
    expect(checkRateLimit(key, t0 + 5000)).toEqual({ allowed: false, reason: "burst" });
    // A minute later the burst window has passed.
    expect(checkRateLimit(key, t0 + 70_000).allowed).toBe(true);
  });

  it("enforces the daily quota and resets on a new UTC day", () => {
    process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT = "5";
    const key = anonymousKey("198.51.100.2");
    const day1 = Date.parse("2026-07-22T10:00:00Z");
    // Space calls a minute apart so the burst limit never interferes.
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, day1 + i * 61_000).allowed).toBe(true);
    }
    expect(checkRateLimit(key, day1 + 6 * 61_000)).toEqual({ allowed: false, reason: "daily_quota" });
    // Next UTC day: fresh quota.
    expect(checkRateLimit(key, day1 + 24 * 3_600_000).allowed).toBe(true);
  });

  it("limits are per-visitor, not global", () => {
    const t0 = Date.now();
    for (let i = 0; i < 4; i++) checkRateLimit(anonymousKey("198.51.100.3"), t0 + i * 1000);
    expect(checkRateLimit(anonymousKey("198.51.100.4"), t0 + 5000).allowed).toBe(true);
  });
});

describe("tampered share links", () => {
  it("ignores unknown ids entirely", () => {
    const items = shareableIdsToItems("not-real,also-fake,../../etc/passwd");
    expect(items).toEqual([]);
  });

  it("keeps only catalog matches from a mixed list", () => {
    const realId = LIBRARY[0].id;
    const items = shareableIdsToItems(`${realId},javascript:alert(1),unknown`);
    expect(items.map((i) => i.id)).toEqual([realId]);
  });

  it("caps oversized id lists", () => {
    const flood = Array.from({ length: 500 }, (_, i) => `fake-${i}`).join(",");
    expect(shareableIdsToItems(flood).length).toBeLessThanOrEqual(MAX_SHARED_IDS);
  });

  it("every recovered item resolves to a stored catalog URL", () => {
    const ids = LIBRARY.slice(0, 5).map((i) => i.id).join(",");
    for (const item of shareableIdsToItems(ids)) {
      const canonical = LIBRARY.find((l) => l.id === item.id);
      expect(canonical).toBeDefined();
      expect(item.url).toBe(canonical!.url);
    }
  });
});

describe("music vs music video separation", () => {
  it("music_video requests return only official music videos", () => {
    const result = selectMediaForDj({ durationMinutes: 20, mediaTypes: ["music_video"] });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.type === "music" && i.musicVideo === true)).toBe(true);
  });

  it("sermon requests never return music", () => {
    const result = selectMediaForDj({ durationMinutes: 30, mediaTypes: ["sermon"] });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.type === "sermon")).toBe(true);
  });

  it("a mix (no filter) can draw from the whole playable library", () => {
    const result = selectMediaForDj({ durationMinutes: 60 });
    expect(result.items.length).toBeGreaterThan(0);
  });
});

describe("API route enforcement (server-side)", () => {
  const makeRequest = (body: unknown, ip = "192.0.2.55") =>
    new Request("http://localhost/api/digital-dj/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    });

  it("off mode returns 403 before anything else", async () => {
    process.env.DIGITAL_DJ_ACCESS_MODE = "off";
    process.env.OPENAI_API_KEY = "test-key";
    const tripwire = armNetworkTripwire();
    const { POST } = await import("../../api/digital-dj/parse-intent/route");
    const res = await POST(makeRequest({ userText: "hi" }) as never);
    expect(res.status).toBe(403);
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("AI disabled returns a calm 200 with aiEnabled:false and no network call", async () => {
    process.env.DIGITAL_DJ_ACCESS_MODE = "preview";
    process.env.DIGITAL_DJ_AI_ENABLED = "false";
    process.env.OPENAI_API_KEY = "test-key";
    const tripwire = armNetworkTripwire();
    const { POST } = await import("../../api/digital-dj/parse-intent/route");
    const res = await POST(makeRequest({ userText: "hi" }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ intent: null, aiEnabled: false });
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("missing API key behaves like AI disabled", async () => {
    process.env.DIGITAL_DJ_ACCESS_MODE = "preview";
    delete process.env.OPENAI_API_KEY;
    const tripwire = armNetworkTripwire();
    const { POST } = await import("../../api/digital-dj/parse-intent/route");
    const res = await POST(makeRequest({ userText: "hi" }) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).aiEnabled).toBe(false);
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("rate-limited requests get 429 and never reach OpenAI", async () => {
    process.env.DIGITAL_DJ_ACCESS_MODE = "preview";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT = "0";
    const tripwire = armNetworkTripwire();
    const { POST } = await import("../../api/digital-dj/parse-intent/route");
    const res = await POST(makeRequest({ userText: "hi" }) as never);
    expect(res.status).toBe(429);
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("oversized input gets 400 and never reaches OpenAI", async () => {
    process.env.DIGITAL_DJ_ACCESS_MODE = "preview";
    process.env.OPENAI_API_KEY = "test-key";
    const tripwire = armNetworkTripwire();
    const { POST } = await import("../../api/digital-dj/parse-intent/route");
    const res = await POST(makeRequest({ userText: "x".repeat(500) }) as never);
    expect(res.status).toBe(400);
    expect(tripwire).not.toHaveBeenCalled();
  });

  it("subscriber mode blocks an anonymous visitor server-side", async () => {
    process.env.DIGITAL_DJ_ACCESS_MODE = "subscriber";
    process.env.OPENAI_API_KEY = "test-key";
    const tripwire = armNetworkTripwire();
    const { POST } = await import("../../api/digital-dj/parse-intent/route");
    const res = await POST(makeRequest({ userText: "hi" }) as never);
    expect(res.status).toBe(403);
    expect(tripwire).not.toHaveBeenCalled();
  });
});
