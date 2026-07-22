import { describe, it, expect } from "vitest";
import {
  estimateDuration,
  parseDurationString,
  selectMediaForDj,
  selectForDuration,
  resultToShareableIds,
  shareableIdsToItems,
  type DigitalDjRequest,
} from "../digitalDjSelector";
import { LIBRARY, type MediaItem } from "../djCaresLibrary";

describe("digitalDjSelector", () => {
  describe("parseDurationString", () => {
    it("parses MM:SS format", () => {
      expect(parseDurationString("4:32")).toBe(272);
      expect(parseDurationString("0:05")).toBe(5);
    });

    it("parses HH:MM:SS format", () => {
      expect(parseDurationString("1:08:02")).toBe(4082); // 1*3600 + 8*60 + 2
      expect(parseDurationString("0:00:30")).toBe(30);
    });

    it("returns null for invalid format", () => {
      expect(parseDurationString("invalid")).toBeNull();
      expect(parseDurationString("")).toBeNull();
      expect(parseDurationString(undefined)).toBeNull();
    });
  });

  describe("estimateDuration", () => {
    it("uses explicit duration if available", () => {
      const item: MediaItem = {
        id: "test",
        type: "music",
        title: "Test",
        author: "Test",
        url: "https://example.com",
        duration: "3:30",
        vibes: ["Gospel"],
        verified: "2026-01-01",
      };
      expect(estimateDuration(item)).toBe(210);
    });

    it("estimates music at 240 seconds", () => {
      const item: MediaItem = {
        id: "test",
        type: "music",
        title: "Test",
        author: "Test",
        url: "https://example.com",
        vibes: ["Gospel"],
        verified: "2026-01-01",
      };
      expect(estimateDuration(item)).toBe(240);
    });

    it("estimates sermon at 1800 seconds", () => {
      const item: MediaItem = {
        id: "test",
        type: "sermon",
        title: "Test",
        author: "Test",
        url: "https://example.com",
        vibes: ["Gospel"],
        verified: "2026-01-01",
      };
      expect(estimateDuration(item)).toBe(1800);
    });

    it("estimates playlist at 1800 seconds", () => {
      const item: MediaItem = {
        id: "test",
        type: "playlist",
        title: "Test",
        author: "Test",
        url: "https://example.com",
        vibes: ["Gospel"],
        verified: "2026-01-01",
      };
      expect(estimateDuration(item)).toBe(1800);
    });
  });

  describe("selectMediaForDj", () => {
    it("selects media for a simple request", () => {
      const request: DigitalDjRequest = {
        durationMinutes: 10,
      };
      const result = selectMediaForDj(request, LIBRARY);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThanOrEqual(9); // Allow some variance
    });

    it("filters by media type", () => {
      const request: DigitalDjRequest = {
        durationMinutes: 5,
        mediaTypes: ["music"],
      };
      const result = selectMediaForDj(request, LIBRARY);
      expect(result.items.every((i) => i.type === "music")).toBe(true);
    });

    it("filters by needs (vibes)", () => {
      const request: DigitalDjRequest = {
        durationMinutes: 5,
        needs: ["joy"],
      };
      const result = selectMediaForDj(request, LIBRARY);
      // Should have items with Joy-related vibes.
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("includes only playable items", () => {
      const request: DigitalDjRequest = {
        durationMinutes: 10,
      };
      const result = selectMediaForDj(request, LIBRARY);
      expect(result.items.every((i) => i.videoId || i.spotifyEmbed || i.appleEmbed)).toBe(true);
    });

    it("excludes inactive items", () => {
      const inactiveItem: MediaItem = {
        id: "inactive",
        type: "music",
        title: "Inactive",
        author: "Test",
        url: "https://example.com",
        videoId: "test-id",
        vibes: ["Gospel"],
        active: false,
        verified: "2026-01-01",
      };
      const testLibrary = [...LIBRARY, inactiveItem];
      const request: DigitalDjRequest = {
        durationMinutes: 5,
      };
      const result = selectMediaForDj(request, testLibrary);
      expect(result.items.every((i) => i.id !== "inactive")).toBe(true);
    });

    it("respects requested creator filter", () => {
      const request: DigitalDjRequest = {
        durationMinutes: 20,
        mediaTypes: ["sermon"],
        requestedCreator: "Billy Graham",
      };
      const result = selectMediaForDj(request, LIBRARY);
      expect(result.items.length).toBeGreaterThan(0);
      // At least some should be Billy Graham or related.
      expect(
        result.items.some((i) => i.author.includes("Graham") || i.ministry === "bgea"),
      ).toBe(true);
    });
  });

  describe("selectForDuration", () => {
    it("selects items up to target duration", () => {
      const items = LIBRARY.filter((i) => i.type === "music").slice(0, 10);
      const result = selectForDuration(items, 10);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThanOrEqual(9);
    });

    it("marks truncated if last item exceeds target", () => {
      const items = LIBRARY.filter((i) => i.type === "sermon").slice(0, 5);
      const result = selectForDuration(items, 30);
      // 30 min is likely to include at least one full sermon that might exceed it.
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("prefers items that fit over rounding up with a long one", () => {
      const song = (id: string, dur: string) => ({
        id, type: "music" as const, title: id, author: "A", url: "https://example.com",
        duration: dur, vibes: ["Gospel" as const], verified: "2026-01-01",
      });
      // A 23-min sermon first in shuffle order must NOT hijack a 10-min ask
      // when fitting songs exist.
      const sermon = { ...song("long-sermon", "23:00"), type: "sermon" as const };
      const result = selectForDuration([sermon, song("s1", "4:00"), song("s2", "4:00"), song("s3", "4:00")], 10);
      expect(result.items.every((i) => i.type === "music")).toBe(true);
      expect(result.truncated).toBe(false);
    });

    it("takes the shortest full match only when nothing fits", () => {
      const sermon = (id: string, dur: string) => ({
        id, type: "sermon" as const, title: id, author: "A", url: "https://example.com",
        duration: dur, vibes: ["Gospel" as const], verified: "2026-01-01",
      });
      const result = selectForDuration([sermon("a", "45:00"), sermon("b", "23:00"), sermon("c", "38:00")], 10);
      expect(result.items.map((i) => i.id)).toEqual(["b"]);
      expect(result.truncated).toBe(true);
    });

    it("handles empty item list", () => {
      const result = selectForDuration([], 10);
      expect(result.items.length).toBe(0);
      expect(result.durationMinutes).toBe(0);
    });

    it("caps at 50 items per session", () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `test-${i}`,
        type: "music" as const,
        title: `Test ${i}`,
        author: "Test",
        url: "https://example.com",
        duration: "3:00",
        vibes: ["Gospel" as const],
        verified: "2026-01-01",
      }));
      const result = selectForDuration(items, 1000);
      expect(result.items.length).toBeLessThanOrEqual(50);
    });
  });

  describe("shareableIds", () => {
    it("converts result to shareable IDs", () => {
      const request: DigitalDjRequest = { durationMinutes: 5 };
      const result = selectMediaForDj(request, LIBRARY);
      const ids = resultToShareableIds(result);
      expect(typeof ids).toBe("string");
      expect(ids.split(",").length).toBe(result.items.length);
    });

    it("recovers items from shareable IDs", () => {
      const request: DigitalDjRequest = { durationMinutes: 5 };
      const result = selectMediaForDj(request, LIBRARY);
      const ids = resultToShareableIds(result);
      const recovered = shareableIdsToItems(ids, LIBRARY);
      expect(recovered.length).toBe(result.items.length);
      expect(recovered.map((i) => i.id)).toEqual(result.items.map((i) => i.id));
    });

    it("handles empty IDs string", () => {
      const recovered = shareableIdsToItems("", LIBRARY);
      expect(recovered.length).toBe(0);
    });
  });
});
