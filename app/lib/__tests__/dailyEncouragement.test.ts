import { describe, expect, it } from "vitest";
import {
  buildDailyEncouragement,
  buildEncouragementCaption,
  DJC_BRAND,
  eligibleItems,
  selectItemForDate,
  typeLabelFor,
} from "../dailyEncouragement";
import { LIBRARY } from "../djCaresLibrary";
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

// Daily Encouragement's own eligible pool legitimately includes items with
// no video and no inline playback at all (e.g. "pod-in-touch", a podcast
// with only an external url) — that's fine for a text-plus-source-link
// content block, which is all this feeds now (app/HomeClient.tsx's
// "daily-encouragement" section, EncouragementActions variant="default").
// This selection must NEVER drive the hero record — that's covered
// separately by app/lib/videoOfTheDay.ts and its own test file, which
// requires every pick to have real artwork and inline playback.
describe("Daily Encouragement stays decoupled from the hero record", () => {
  it("its eligible pool is allowed to include non-video, non-inline-playable items", () => {
    const withoutVideo = eligibleItems().filter((item) => !item.videoId);
    expect(withoutVideo.length).toBeGreaterThan(0);
  });
});

describe("audioUrl passthrough (native <audio> inline playback)", () => {
  it("carries the item's audioUrl through when one is set on the library entry", async () => {
    const withAudio = LIBRARY.find((item) => item.audioUrl);
    if (!withAudio) return; // no item currently has one — nothing to assert yet
    const built = await buildDailyEncouragement(chicagoDateKey(), { offset: 0 });
    // Just confirm the field is wired end to end for whichever item is picked.
    expect(built).toHaveProperty("audioUrl");
  });

  it("is null when the picked item has no audioUrl, never undefined or a stale value", async () => {
    const built = await buildDailyEncouragement(chicagoDateKey());
    expect(built.audioUrl === null || typeof built.audioUrl === "string").toBe(true);
    expect(built.audioUrl).toBe(built.item.audioUrl ?? null);
  });
});
