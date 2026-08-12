// Homepage hierarchy guard (owner, 2026-08-11): Daily Encouragement is the
// reason to arrive — it must lead the Spin-tab content journey, with Videos,
// Playlists, Sermons, Podcasts following and Digital DJ demoted to a
// secondary discovery tool after them. The nav's Daily Encouragement item
// must still resolve, and /today must stay intact as the dedicated,
// shareable daily page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const layout = readFileSync(join(app, "layout.tsx"), "utf8");
const page = readFileSync(join(app, "page.tsx"), "utf8");
const today = readFileSync(join(app, "today/page.tsx"), "utf8");

// Index of the first match, or -1. Fails loudly (via the caller's assertion)
// rather than silently comparing two -1s as "in order".
const at = (haystack: string, needle: string) => haystack.indexOf(needle);

describe("homepage content order", () => {
  it("Daily Encouragement hero leads, ahead of every other homepage section", () => {
    const hero = at(homeClient, 'aria-label="Daily Encouragement"');
    const videos = at(homeClient, 'aria-label="Music Videos preview"');
    const music = at(homeClient, 'aria-label="The Music"');
    const sermons = at(homeClient, ">✝️ Sermons</h2>");
    const podcasts = at(homeClient, ">🎙️ Podcasts</h2>");
    const digitalDj = at(homeClient, 'aria-label="Digital DJ"');

    for (const idx of [hero, videos, music, sermons, podcasts, digitalDj]) {
      expect(idx).toBeGreaterThan(-1);
    }
    expect(hero).toBeLessThan(videos);
    expect(videos).toBeLessThan(music);
    expect(music).toBeLessThan(sermons);
    expect(sermons).toBeLessThan(podcasts);
    expect(podcasts).toBeLessThan(digitalDj);
  });

  it("Digital DJ is demoted below the primary content journey, not deleted", () => {
    expect(homeClient).toContain("What should we play?");
    expect(homeClient).toContain('href="/digital-dj"');
  });

  it("the homepage fetches the same daily pick /today shows, and never crashes the page if it fails", () => {
    expect(page).toContain("buildDailyEncouragement");
    expect(page).toContain("chicagoDateKey");
    expect(page).toMatch(/catch\s*\{?\s*return null/);
    expect(page).toContain("daily={daily}");
  });
});

describe("Daily Encouragement navigation", () => {
  it("the nav's Daily Encouragement item resolves to the daily experience", () => {
    const match = layout.match(/name:\s*"Daily Encouragement",\s*href:\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("/today");
  });

  it("/today remains the dedicated, shareable daily page", () => {
    expect(today).toContain("DailyEncouragementView");
    expect(today).toContain("buildDailyEncouragement");
  });
});
