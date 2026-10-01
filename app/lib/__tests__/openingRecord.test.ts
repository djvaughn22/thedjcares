// ─────────────────────────────────────────────────────────────────────────────
// THE SITE OPENS ON "GOOD DAY".
//
// The owner pinned one record as the thing TheDJCares.com leads with on a new
// visit, every day, instead of whichever video the daily rotation landed on.
// A greeting that changes every morning is not a greeting.
//
// What this file is really guarding is the SECOND half of that request: only
// the opening pick is pinned. The rotation itself still has to work, because
// Shuffle on the hero deals from it, and the rest of the catalogue has to keep
// its existing relative order behind this one record.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import { LIBRARY } from "../djCaresLibrary";
import {
  OPENING_RECORD_ID,
  eligibleVideosOfTheDay,
  selectVideoOfTheDay,
} from "../videoOfTheDay";

const opener = LIBRARY.find((item) => item.id === OPENING_RECORD_ID);

describe("the opening record", () => {
  it("exists in the library, so the homepage never falls back silently", () => {
    expect(opener, `${OPENING_RECORD_ID} is not in the library`).toBeDefined();
  });

  it("is GOOD DAY by Forrest Frank — the exact song that was asked for", () => {
    expect(opener!.title).toBe("GOOD DAY");
    expect(opener!.author).toBe("Forrest Frank");
  });

  it("keeps the exact video, which is what carries the image", () => {
    // The hero's artwork is derived from the YouTube id
    // (i.ytimg.com/vi/<id>/hqdefault.jpg). Changing the id changes the
    // picture the owner approved, so the id is the thing to pin.
    expect(opener!.videoId).toBe("eO7-9WzLDZo");
    expect(opener!.type).toBe("music");
  });

  it("is a real music video, so the hero can actually play it inline", () => {
    // The hero record's whole contract: a real thumbnail and inline playback.
    expect(eligibleVideosOfTheDay()).toContainEqual(expect.objectContaining({ id: OPENING_RECORD_ID }));
  });
});

describe("pinning the opener changed nothing else", () => {
  it("leaves the daily rotation rotating, for Shuffle to deal from", () => {
    // If pinning had been done by making selectVideoOfTheDay always return
    // one song, Shuffle would deal the same record forever.
    const picks = new Set(
      ["2026-07-12", "2026-07-13", "2026-07-14", "2026-08-01", "2026-09-30"].map(
        (day) => selectVideoOfTheDay(day)?.id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("keeps the catalogue's own order untouched — the pin is not a re-sort", () => {
    // "Keep the existing playlist in its current relative order after Good
    // Day." The honest way to do that is to leave the data alone and pin the
    // opening pick at the page, which is what was done: GOOD DAY still sits
    // where it always sat in the library, and Way Maker still leads it.
    const music = LIBRARY.filter((i) => i.type === "music").map((i) => i.id);
    expect(music[0]).toBe("song-way-maker");
    expect(music.indexOf(OPENING_RECORD_ID)).toBeGreaterThan(0);
  });
});
