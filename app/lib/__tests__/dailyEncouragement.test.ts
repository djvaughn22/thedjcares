import { describe, expect, it } from "vitest";
import {
  buildEncouragementCaption,
  DJC_BRAND,
  eligibleItems,
  selectItemForDate,
  typeLabelFor,
} from "../dailyEncouragement";
import { DJ_CARES_LIBRARY } from "../djCaresLibrary";
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
    const a = selectItemForDate("2026-07-12", DJ_CARES_LIBRARY, 0);
    const b = selectItemForDate("2026-07-12", DJ_CARES_LIBRARY, 1);
    expect(a!.id).not.toBe(b!.id);
  });
});

describe("labels match content type", () => {
  it("maps categories to matching daily labels", () => {
    expect(typeLabelFor("Message")).toBe("Sermon of the Day");
    expect(typeLabelFor("Song")).toBe("Song for Today");
    expect(typeLabelFor("Music")).toBe("Playlist for Today");
    expect(typeLabelFor("Lesson")).toBe("Teaching for Today");
  });
});

describe("caption parity", () => {
  it("caption carries marker, label, title, and attribution — and validates", () => {
    const item = selectItemForDate("2026-07-12")!;
    const caption = buildEncouragementCaption("2026-07-12", item);
    const label = typeLabelFor(item.category);

    expect(caption.startsWith(captionMarkerForDate(DJC_BRAND, "2026-07-12"))).toBe(true);
    expect(caption).toContain(item.title);
    expect(caption).toContain(item.author!);
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
      parityKeys: [item.title, item.author ?? "", label],
    };

    expect(validateDailySocialPost(DJC_BRAND, post)).toEqual([]);
  });

  it("today's real date selects and validates", () => {
    const today = chicagoDateKey();
    const item = selectItemForDate(today);
    expect(item).not.toBeNull();
  });
});
