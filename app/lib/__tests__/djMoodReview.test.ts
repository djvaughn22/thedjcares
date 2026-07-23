// Mood-integrity tests (P0, Jul 22 2026): a Joy request served "My Jesus",
// a grief-born testimony song carrying a hand-typed Joy vibe. These tests
// lock in the rule: mood-specific recommendations reflect the dominant
// listening experience, and flagged items stay out until the owner reviews
// them — for every mood, every swap, and "surprise me".

import { describe, it, expect } from "vitest";
import {
  MOOD_REVIEWS,
  moodAllows,
  moodEligible,
  recommendableAtAll,
  type CatalogMoodReview,
} from "../djMoodReview";
import { eligibleForSomeNeed, selectMediaForDj, NEED_TO_VIBES, type DjNeed } from "../digitalDjSelector";
import { swapItem } from "../digitalDjSession";
import { LIBRARY } from "../djCaresLibrary";

const ALL_NEEDS: DjNeed[] = [
  "encouragement", "joy", "peace", "hope", "faith", "family", "morning", "evening", "surprise",
];

describe("the P0 item: My Jesus", () => {
  const myJesus = LIBRARY.find((i) => i.id === "song-my-jesus")!;

  it("no longer carries a Joy vibe in the catalog", () => {
    expect(myJesus.vibes).not.toContain("Joy");
  });

  it("stays in the catalog (Gospel/Hope), it is not deleted", () => {
    expect(myJesus).toBeDefined();
    expect(myJesus.active).not.toBe(false);
    expect(myJesus.vibes).toContain("Gospel");
  });

  it("is excluded from EVERY mood-specific recommendation until owner-reviewed", () => {
    for (const need of ALL_NEEDS) {
      expect(eligibleForSomeNeed(myJesus, [need])).toBe(false);
    }
  });

  it("never appears in a joy selection across many runs", () => {
    for (let run = 0; run < 40; run++) {
      const result = selectMediaForDj({ durationMinutes: 60, needs: ["joy"] });
      expect(result.items.map((i) => i.id)).not.toContain("song-my-jesus");
    }
  });
});

describe("the class rule, not a one-title exception", () => {
  it("Scars in Heaven (bereavement) is out of the family and joy pools", () => {
    const scars = LIBRARY.find((i) => i.id === "song-scars-in-heaven")!;
    expect(scars.vibes).not.toContain("Family");
    expect(eligibleForSomeNeed(scars, ["family"])).toBe(false);
    expect(eligibleForSomeNeed(scars, ["joy"])).toBe(false);
  });

  it("every flagged, unreviewed item is out of every mood and out of surprise", () => {
    for (const [id, review] of Object.entries(MOOD_REVIEWS)) {
      if (review.ownerReviewed) continue;
      const item = LIBRARY.find((i) => i.id === id);
      if (!item) continue;
      for (const need of ALL_NEEDS) {
        expect(eligibleForSomeNeed(item, [need]), `${id} leaked into ${need}`).toBe(false);
      }
      expect(recommendableAtAll(id)).toBe(false);
    }
  });

  it("flagged items never appear in mood selections across many runs", () => {
    const flagged = new Set(
      Object.entries(MOOD_REVIEWS)
        .filter(([, r]) => !r.ownerReviewed)
        .map(([id]) => id),
    );
    for (const need of ["joy", "peace", "family", "encouragement", "surprise"] as DjNeed[]) {
      for (let run = 0; run < 15; run++) {
        const result = selectMediaForDj({ durationMinutes: 60, needs: [need] });
        for (const item of result.items) {
          expect(flagged.has(item.id), `${item.id} leaked into ${need}`).toBe(false);
        }
      }
    }
  });

  it("flagged items remain available outside mood recommendations (no-mood mixes)", () => {
    // A creator request with no needs must still be able to play Anne Wilson.
    const result = selectMediaForDj({ durationMinutes: 10, requestedCreator: "Anne Wilson" });
    expect(result.items.some((i) => i.id === "song-my-jesus")).toBe(true);
  });

  it("swaps never bring a flagged item back", () => {
    const joySong = LIBRARY.find((i) => i.id === "song-good-day")!;
    for (let r = 0; r < 20; r++) {
      const next = swapItem([joySong], 0, LIBRARY, () => r / 20);
      if (next) {
        expect(MOOD_REVIEWS[next[0].id]?.ownerReviewed ?? true, `${next[0].id} via swap`).toBe(true);
      }
    }
  });
});

describe("moodAllows contract", () => {
  const reviewed: CatalogMoodReview = {
    eligibleMoods: ["hope", "comfort"],
    excludedMoods: ["joy"],
    ownerReviewed: true,
  };

  it("unflagged items keep vibe behavior", () => {
    expect(moodAllows(undefined, "joy")).toBe(true);
  });

  it("flagged-unreviewed items are always refused", () => {
    expect(moodAllows({ ...reviewed, ownerReviewed: false }, "hope")).toBe(false);
  });

  it("owner-reviewed items serve exactly eligible minus excluded", () => {
    expect(moodAllows(reviewed, "hope")).toBe(true);
    expect(moodAllows(reviewed, "comfort")).toBe(true);
    expect(moodAllows(reviewed, "joy")).toBe(false);
    expect(moodAllows(reviewed, "peace")).toBe(false);
  });
});

describe("review data hygiene", () => {
  it("every review id points at a real catalog item", () => {
    for (const id of Object.keys(MOOD_REVIEWS)) {
      expect(LIBRARY.some((i) => i.id === id), `${id} not in catalog`).toBe(true);
    }
  });

  it("nothing death/grief-centered may claim joy without explicit owner approval", () => {
    for (const [id, review] of Object.entries(MOOD_REVIEWS)) {
      const heavyLoss = review.sensitiveThemes?.some((t) => t === "death" || t === "grief");
      if (heavyLoss && review.eligibleMoods.includes("joy")) {
        expect(review.ownerReviewed, `${id} claims joy over death/grief without owner approval`).toBe(true);
      }
    }
  });

  it("today, no review grants any mood — none are owner-reviewed yet", () => {
    expect(Object.values(MOOD_REVIEWS).every((r) => !r.ownerReviewed)).toBe(true);
  });

  it("joy's vibe mapping stays praise/celebration-centered", () => {
    expect(NEED_TO_VIBES.joy).toEqual(["Joy", "Worship"]);
  });
});
