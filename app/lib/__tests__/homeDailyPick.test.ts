import { describe, expect, it } from "vitest";
import {
  eligibleHomeDailyPicks,
  HOME_DAILY_PICK_START,
  selectHomeDailyPick,
} from "../homeDailyPick";
import { addDaysToDateKey } from "../dailySocialCore";
import { isPlayable, LIBRARY, type MediaItem } from "../djCaresLibrary";

// Minimal, valid MediaItem builder for synthetic eligibility-pool tests.
const item = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  id,
  type: "sermon",
  playbackExperience: "sermon",
  title: `Item ${id}`,
  author: "Test Speaker",
  url: `https://example.com/${id}`,
  vibes: [],
  verified: "2026-01-01",
  ...extra,
});

describe("homepage Daily Encouragement eligibility — must always be inline-playable", () => {
  it("every eligible pick passes the site's one canonical isPlayable() check", () => {
    const eligible = eligibleHomeDailyPicks();
    expect(eligible.length).toBeGreaterThan(10);
    for (const pick of eligible) {
      expect(isPlayable(pick)).toBe(true);
    }
  });

  it("only sermons or podcasts — never a link-out-only item, never music/playlist", () => {
    for (const pick of eligibleHomeDailyPicks()) {
      expect(["sermon", "podcast"]).toContain(pick.type);
    }
  });

  it("REGRESSION: selectHomeDailyPick can never resolve to an unplayable item, across a full rotation", () => {
    const size = eligibleHomeDailyPicks().length;
    for (let day = 0; day < size; day += 1) {
      const pick = selectHomeDailyPick(addDaysToDateKey(HOME_DAILY_PICK_START, day));
      expect(pick).not.toBeNull();
      expect(isPlayable(pick!)).toBe(true);
    }
  });

  it("REGRESSION: today's real date resolves to a real, playable item against the full library, so the homepage card always has a Play here", () => {
    const pick = selectHomeDailyPick("2026-08-23", LIBRARY);
    expect(pick).not.toBeNull();
    expect(isPlayable(pick!)).toBe(true);
    expect(["sermon", "podcast"]).toContain(pick!.type);
  });

  it("an item with no verified playable media (e.g. Love Worth Finding today) is excluded from the eligible pool entirely", () => {
    const pool = [
      item("lwf-no-media", { author: "Adrian Rogers", url: "https://www.oneplace.com/ministries/love-worth-finding/" }),
      item("real-sermon", { videoId: "abc123XYZ0" }),
    ];
    const eligible = eligibleHomeDailyPicks(pool);
    expect(eligible.map((i) => i.id)).toEqual(["real-sermon"]);
  });

  it("a direct audioUrl alone is enough to qualify", () => {
    const pool = [item("audio-only", { audioUrl: "https://example.com/episode.mp3" })];
    expect(eligibleHomeDailyPicks(pool).map((i) => i.id)).toEqual(["audio-only"]);
  });

  it("a Spotify/Apple embed alone is enough to qualify", () => {
    const pool = [item("embed-only", { spotifyEmbed: "https://open.spotify.com/embed/show/x" })];
    expect(eligibleHomeDailyPicks(pool).map((i) => i.id)).toEqual(["embed-only"]);
  });

  it("an empty or all-unplayable pool returns null instead of throwing (never 500s the homepage)", () => {
    expect(selectHomeDailyPick("2026-08-23", [])).toBeNull();
    expect(selectHomeDailyPick("2026-08-23", [item("no-media")])).toBeNull();
  });
});

describe("deterministic rotation, independent from /today and Video of the Day", () => {
  it("same date → same pick", () => {
    expect(selectHomeDailyPick("2026-07-20")!.id).toBe(selectHomeDailyPick("2026-07-20")!.id);
  });

  it("cycles the whole eligible pool before repeating", () => {
    const size = eligibleHomeDailyPicks().length;
    const seen = new Set<string>();
    for (let day = 0; day < size; day += 1) {
      const pick = selectHomeDailyPick(addDaysToDateKey(HOME_DAILY_PICK_START, day));
      seen.add(pick!.id);
    }
    expect(seen.size).toBe(size);
  });

  it("uses its own anchor date — not DJC_BRAND's, not VIDEO_OF_THE_DAY_START's", () => {
    expect(HOME_DAILY_PICK_START).toBe("2026-07-12");
  });
});
