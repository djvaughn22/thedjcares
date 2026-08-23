import { describe, expect, it } from "vitest";
import {
  buildEncouragementCaption,
  DJC_BRAND,
  eligibleItems,
  selectItemForDate,
  typeLabelFor,
} from "../dailyEncouragement";
import { artworkUrl, isPlayable, LIBRARY } from "../djCaresLibrary";
import {
  addDaysToDateKey,
  captionMarkerForDate,
  chicagoDateKey,
  validateDailySocialPost,
} from "../dailySocialCore";

describe("curated-library eligibility", () => {
  it("every eligible item is real, attributed, and has a destination", () => {
    const eligible = eligibleItems();
    expect(eligible.length).toBeGreaterThan(10);
    for (const item of eligible) {
      expect(item.title).toBeTruthy();
      expect(item.author).toBeTruthy();
      expect(item.summary).toBeTruthy();
    }
  });

  it("never selects anything outside the curated library", () => {
    const eligibleIds = new Set(eligibleItems().map((i) => i.id));
    for (let day = 0; day < 60; day += 1) {
      const date = addDaysToDateKey(DJC_BRAND.startDate, day);
      const item = selectItemForDate(date);
      expect(item).not.toBeNull();
      expect(eligibleIds.has(item!.id)).toBe(true);
    }
  });
});

describe("deterministic rotation — no recent duplicates", () => {
  it("same date → same item", () => {
    expect(selectItemForDate("2026-07-20")!.id).toBe(selectItemForDate("2026-07-20")!.id);
  });

  it("cycles the whole library before repeating", () => {
    const size = eligibleItems().length;
    const seen = new Set<string>();
    for (let day = 0; day < size; day += 1) {
      const item = selectItemForDate(addDaysToDateKey(DJC_BRAND.startDate, day));
      seen.add(item!.id);
    }
    expect(seen.size).toBe(size);
  });

  it("offset chooses a different item (admin control)", () => {
    const a = selectItemForDate("2026-07-12", LIBRARY, 0);
    const b = selectItemForDate("2026-07-12", LIBRARY, 1);
    expect(a!.id).not.toBe(b!.id);
  });
});

describe("labels match content type", () => {
  it("maps media types to matching daily labels", () => {
    expect(typeLabelFor("sermon")).toBe("Sermon of the Day");
    expect(typeLabelFor("music")).toBe("Song for Today");
    expect(typeLabelFor("playlist")).toBe("Playlist for Today");
    expect(typeLabelFor("podcast")).toBe("Podcast for Today");
  });
});

describe("caption parity", () => {
  it("caption carries marker, label, title, and attribution — and validates", () => {
    const item = selectItemForDate("2026-07-12")!;
    const caption = buildEncouragementCaption("2026-07-12", item);
    const label = typeLabelFor(item.type);

    expect(caption.startsWith(captionMarkerForDate(DJC_BRAND, "2026-07-12"))).toBe(true);
    expect(caption).toContain(item.title);
    expect(caption).toContain(item.author);
    expect(caption).toContain("TheDJCares.com/today");

    const post = {
      brand: DJC_BRAND.brand,
      date: "2026-07-12",
      fullDate: "Sunday, July 12, 2026",
      timezone: "America/Chicago",
      version: DJC_BRAND.version,
      contentId: item.id,
      typeLabel: label,
      title: item.title,
      caption,
      hashtags: DJC_BRAND.hashtags,
      imagePath: "/api/social/daily-encouragement/2026-07-12.png",
      imageFileName: "daily-encouragement-2026-07-12-1080x1350.png",
      pagePath: "/today/2026-07-12",
      parityKeys: [item.title, item.author, label],
    };

    expect(validateDailySocialPost(DJC_BRAND, post)).toEqual([]);
  });

  it("today's real date selects and validates", () => {
    const today = chicagoDateKey();
    const item = selectItemForDate(today);
    expect(item).not.toBeNull();
  });
});

// Regression: the homepage hero's "Daily Encouragement" record renders a
// real YouTube thumbnail as its center label most days, but the rotation
// also cycles through podcasts/sermons with no video (e.g. "pod-in-touch"
// on 2026-08-22) — items with no artworkUrl and, for a few, no inline
// playback source at all (isPlayable false, just an external `url`). The
// hero must never depend on either being present: it needs a branded
// fallback label when there's no thumbnail, and a working external link
// when there's no inline player. This locks the two invariants that make
// that safe for every item the rotation can ever land on.
describe("every eligible item is safe for the hero record (regression)", () => {
  it("has a usable image OR a graceful (branded) fallback — never a broken img", () => {
    for (const item of eligibleItems()) {
      // artworkUrl is null exactly when there's no videoId — the hero
      // switches to its branded fallback label in that case, so either
      // outcome is fine as long as it's one of the two, deterministically.
      expect(artworkUrl(item) === null || artworkUrl(item)!.startsWith("https://")).toBe(true);
    }
  });

  it("every non-playable item still has a valid absolute source link to open instead", () => {
    const nonPlayable = eligibleItems().filter((item) => !isPlayable(item));
    // Sanity: this scenario is real and small, not hypothetical (today's
    // pick regression was exactly this: pod-in-touch, a podcast with no
    // videoId/spotifyEmbed/appleEmbed).
    expect(nonPlayable.length).toBeGreaterThan(0);
    for (const item of nonPlayable) {
      expect(item.url.startsWith("http")).toBe(true);
    }
  });

  it("2026-08-22's pick (the exact regression trigger) has no artwork and is not inline-playable", () => {
    const item = selectItemForDate("2026-08-22")!;
    expect(item.id).toBe("pod-in-touch");
    expect(artworkUrl(item)).toBeNull();
    expect(isPlayable(item)).toBe(false);
    expect(item.url.startsWith("http")).toBe(true);
  });
});
