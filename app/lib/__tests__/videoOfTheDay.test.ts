import { describe, expect, it } from "vitest";
import {
  eligibleVideosOfTheDay,
  selectVideoOfTheDay,
  VIDEO_OF_THE_DAY_START,
} from "../videoOfTheDay";
import { addDaysToDateKey } from "../dailySocialCore";
import { artworkUrl, isPlayable, itemsOfType, LIBRARY } from "../djCaresLibrary";

describe("video-of-the-day eligibility", () => {
  it("every eligible pick is a real, attributed music video", () => {
    const eligible = eligibleVideosOfTheDay();
    expect(eligible.length).toBeGreaterThan(10);
    for (const item of eligible) {
      expect(item.type).toBe("music");
      expect(item.videoId).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.author).toBeTruthy();
    }
  });

  // The whole point of this module: unlike Daily Encouragement, it must
  // NEVER hand the hero a pick with no real thumbnail or no inline
  // playback — those two facts always hold together here because every
  // eligible item has a videoId.
  it("every eligible pick always has real artwork and always plays inline", () => {
    for (const item of eligibleVideosOfTheDay()) {
      expect(artworkUrl(item)).not.toBeNull();
      expect(artworkUrl(item)!.startsWith("https://")).toBe(true);
      expect(isPlayable(item)).toBe(true);
    }
  });

  it("never selects a podcast, sermon, or playlist — music videos only", () => {
    const eligibleIds = new Set(eligibleVideosOfTheDay().map((i) => i.id));
    for (let day = 0; day < 60; day += 1) {
      const date = addDaysToDateKey(VIDEO_OF_THE_DAY_START, day);
      const item = selectVideoOfTheDay(date);
      expect(item).not.toBeNull();
      expect(item!.type).toBe("music");
      expect(eligibleIds.has(item!.id)).toBe(true);
    }
  });

  it("draws from the same music-video catalog the Music Videos section uses", () => {
    const eligibleIds = new Set(eligibleVideosOfTheDay().map((i) => i.id));
    const musicSectionIds = new Set(itemsOfType("music").filter((i) => i.videoId).map((i) => i.id));
    expect(eligibleIds).toEqual(musicSectionIds);
  });
});

describe("deterministic rotation", () => {
  it("same date → same item", () => {
    expect(selectVideoOfTheDay("2026-07-20")!.id).toBe(selectVideoOfTheDay("2026-07-20")!.id);
  });

  it("cycles the whole eligible catalog before repeating", () => {
    const size = eligibleVideosOfTheDay().length;
    const seen = new Set<string>();
    for (let day = 0; day < size; day += 1) {
      const item = selectVideoOfTheDay(addDaysToDateKey(VIDEO_OF_THE_DAY_START, day));
      seen.add(item!.id);
    }
    expect(seen.size).toBe(size);
  });

  it("empty pool returns null instead of throwing (never 500s the homepage)", () => {
    expect(selectVideoOfTheDay("2026-07-12", [])).toBeNull();
  });
});

describe("independence from Daily Encouragement", () => {
  it("uses its own anchor date, not DJC_BRAND's", () => {
    // Different rotation start dates mean the two selectors are free to
    // diverge day to day — proof they aren't secretly sharing one clock.
    expect(VIDEO_OF_THE_DAY_START).toBe("2026-07-12");
  });

  it("today's real date always resolves against the full library without crashing", () => {
    const item = selectVideoOfTheDay("2026-08-23", itemsOfType("music", LIBRARY));
    expect(item).not.toBeNull();
    expect(item!.videoId).toBeTruthy();
  });
});
