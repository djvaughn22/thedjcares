import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSessionHistory,
  markAsPlayed,
  hasPlayed,
  getPlayedCount,
  getPlayOrder,
  isSessionStale,
  saveSessionHistory,
  loadSessionHistory,
  clearSessionHistory,
  type SessionHistory,
} from "../sessionHistory";

describe("SessionHistory", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe("createSessionHistory", () => {
    it("creates a new empty session with current timestamp", () => {
      const now = Date.now();
      const history = createSessionHistory();

      expect(history.playedIds).toEqual(new Set());
      expect(history.playOrder).toEqual([]);
      expect(history.startTime).toBeGreaterThanOrEqual(now);
    });
  });

  describe("markAsPlayed", () => {
    it("adds an item to playedIds and playOrder", () => {
      const history = createSessionHistory();
      const marked = markAsPlayed(history, "item1");

      expect(marked.playedIds.has("item1")).toBe(true);
      expect(marked.playOrder).toContain("item1");
    });

    it("does not duplicate items in playedIds", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "item1");
      markAsPlayed(history, "item1");

      expect(history.playedIds.size).toBe(1);
      expect(history.playOrder).toHaveLength(1);
    });

    it("maintains chronological order in playOrder", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "a");
      markAsPlayed(history, "b");
      markAsPlayed(history, "c");

      expect(history.playOrder).toEqual(["a", "b", "c"]);
    });
  });

  describe("hasPlayed", () => {
    it("returns true for played items", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "item1");

      expect(hasPlayed(history, "item1")).toBe(true);
    });

    it("returns false for unplayed items", () => {
      const history = createSessionHistory();

      expect(hasPlayed(history, "unplayed")).toBe(false);
    });
  });

  describe("getPlayedCount", () => {
    it("returns the number of unique played items", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "a");
      markAsPlayed(history, "b");
      markAsPlayed(history, "a"); // duplicate

      expect(getPlayedCount(history)).toBe(2);
    });

    it("returns 0 for empty session", () => {
      const history = createSessionHistory();

      expect(getPlayedCount(history)).toBe(0);
    });
  });

  describe("getPlayOrder", () => {
    it("returns a copy of playOrder array", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "a");
      markAsPlayed(history, "b");

      const order = getPlayOrder(history);
      expect(order).toEqual(["a", "b"]);
      expect(order).not.toBe(history.playOrder);
    });

    it("includes all played items in order", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "x");
      markAsPlayed(history, "y");
      markAsPlayed(history, "z");

      expect(getPlayOrder(history)).toEqual(["x", "y", "z"]);
    });
  });

  describe("isSessionStale", () => {
    it("returns false for fresh sessions", () => {
      const history = createSessionHistory();

      expect(isSessionStale(history)).toBe(false);
    });

    it("returns true after 4 hours", () => {
      const history = createSessionHistory();
      // Advance time by 4 hours + 1 second
      vi.advanceTimersByTime(1000 * 60 * 60 * 4 + 1000);

      expect(isSessionStale(history)).toBe(true);
    });

    it("returns false just before 4 hour threshold", () => {
      const history = createSessionHistory();
      // Advance time by 4 hours - 1 second
      vi.advanceTimersByTime(1000 * 60 * 60 * 4 - 1000);

      expect(isSessionStale(history)).toBe(false);
    });
  });

  describe("saveSessionHistory and loadSessionHistory", () => {
    it("persists and restores session history", () => {
      const original = createSessionHistory();
      markAsPlayed(original, "song1");
      markAsPlayed(original, "song2");

      saveSessionHistory(original);
      const loaded = loadSessionHistory();

      expect(hasPlayed(loaded, "song1")).toBe(true);
      expect(hasPlayed(loaded, "song2")).toBe(true);
      expect(getPlayedCount(loaded)).toBe(2);
      expect(getPlayOrder(loaded)).toEqual(["song1", "song2"]);
    });

    it("converts playedIds Set to array in storage", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "test");

      saveSessionHistory(history);
      const stored = localStorage.getItem("djc-session-history");

      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed.playedIds)).toBe(true);
      expect(parsed.playedIds).toContain("test");
    });

    it("returns fresh session when storage is empty", () => {
      localStorage.clear();
      const history = loadSessionHistory();

      expect(getPlayedCount(history)).toBe(0);
      expect(history.playOrder).toEqual([]);
    });

    it("returns fresh session for stale storage", () => {
      const old = createSessionHistory();
      markAsPlayed(old, "old-song");
      saveSessionHistory(old);

      // Advance time past 4 hour TTL
      vi.advanceTimersByTime(1000 * 60 * 60 * 4 + 1000);

      const loaded = loadSessionHistory();

      expect(getPlayedCount(loaded)).toBe(0);
      expect(hasPlayed(loaded, "old-song")).toBe(false);
    });

    it("gracefully handles corrupted storage", () => {
      localStorage.setItem("djc-session-history", "invalid json {");

      const history = loadSessionHistory();

      expect(getPlayedCount(history)).toBe(0);
      expect(history.playOrder).toEqual([]);
    });
  });

  describe("clearSessionHistory", () => {
    it("removes session from storage", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "song");
      saveSessionHistory(history);

      clearSessionHistory();

      expect(localStorage.getItem("djc-session-history")).toBeNull();
    });

    it("allows loading fresh session after clear", () => {
      const history = createSessionHistory();
      markAsPlayed(history, "song");
      saveSessionHistory(history);

      clearSessionHistory();
      const loaded = loadSessionHistory();

      expect(getPlayedCount(loaded)).toBe(0);
    });
  });
});
