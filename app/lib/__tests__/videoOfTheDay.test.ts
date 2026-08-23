import { describe, expect, it } from "vitest";
import {
  eligibleVideosOfTheDay,
  selectVideoOfTheDay,
  VIDEO_OF_THE_DAY_START,
} from "../videoOfTheDay";
import { addDaysToDateKey } from "../dailySocialCore";
import { artworkUrl, isPlayable, itemsOfType, LIBRARY, type MediaItem } from "../djCaresLibrary";

// Minimal, valid MediaItem builder for synthetic eligibility-pool tests —
// only the fields eligibleVideosOfTheDay() actually looks at vary per call.
const song = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  id,
  type: "music",
  playbackExperience: "watch",
  title: `Song ${id}`,
  author: "Test Artist",
  url: `https://youtube.com/watch?v=${id}`,
  videoId: id,
  vibes: [],
  verified: "2026-01-01",
  ...extra,
});

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

  it("draws only from within the Music Videos section's catalog (never outside it)", () => {
    const eligibleIds = new Set(eligibleVideosOfTheDay().map((i) => i.id));
    const musicSectionIds = new Set(itemsOfType("music").filter((i) => i.videoId).map((i) => i.id));
    for (const id of eligibleIds) {
      expect(musicSectionIds.has(id)).toBe(true);
    }
  });
});

describe("prefers official music videos, falls back to the full catalog", () => {
  it("on the real library, only picks items flagged musicVideo: true", () => {
    // Real-data sanity: DJ's actual catalog has plenty of musicVideo: true
    // songs, so the preferred pool should never be empty in practice, and
    // eligibility should reflect that preference rather than the fallback.
    for (const item of eligibleVideosOfTheDay()) {
      expect(item.musicVideo).toBe(true);
    }
  });

  it("prefers musicVideo: true items over plain audio-first uploads when both exist", () => {
    const pool = [
      song("official-1", { musicVideo: true }),
      song("official-2", { musicVideo: true }),
      song("plain-1"), // no musicVideo flag — an audio-first upload
      song("plain-2", { musicVideo: false }),
    ];
    const eligible = eligibleVideosOfTheDay(pool);
    expect(eligible.map((i) => i.id).sort()).toEqual(["official-1", "official-2"]);
  });

  it("falls back to the full playable-song catalog when no musicVideo: true item exists", () => {
    const pool = [song("plain-1"), song("plain-2", { musicVideo: false }), song("plain-3")];
    const eligible = eligibleVideosOfTheDay(pool);
    expect(eligible.map((i) => i.id).sort()).toEqual(["plain-1", "plain-2", "plain-3"]);
  });

  it("the fallback still only contains real, inline-playable items with artwork", () => {
    const pool = [song("plain-1"), song("plain-2")];
    for (const item of eligibleVideosOfTheDay(pool)) {
      expect(artworkUrl(item)).not.toBeNull();
      expect(isPlayable(item)).toBe(true);
    }
  });

  it("an empty pool stays empty (no crash, selectVideoOfTheDay handles it as null)", () => {
    expect(eligibleVideosOfTheDay([])).toEqual([]);
    expect(selectVideoOfTheDay("2026-08-23", [])).toBeNull();
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
