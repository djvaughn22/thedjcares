// Single-page homepage guard (owner, 2026-08-12): Daily Encouragement leads
// into ONE continuous Now Playing player, then Videos, Music, Sermons,
// Podcasts, and Digital DJ last — all on "/", reachable by menu anchors
// rather than route navigation. /today is retired as a destination (old
// links/bookmarks redirect gracefully instead of duplicating the UI).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const root = join(app, "..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const layout = readFileSync(join(app, "layout.tsx"), "utf8");
const page = readFileSync(join(app, "page.tsx"), "utf8");
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");

const at = (haystack: string, needle: string) => haystack.indexOf(needle);

describe("homepage section order", () => {
  it("merged Daily Encouragement / Now Playing hero, then Videos/Music/Sermons/Podcasts, Digital DJ last", () => {
    // `deck` (id="now-playing") is a const defined well above the return
    // statement and referenced by name where it actually renders — so its
    // render POSITION is this insertion line, not its definition's id=.
    const daily = at(homeClient, 'id="daily-encouragement"');
    const videos = at(homeClient, 'id="videos"');
    const music = at(homeClient, 'id="music"');
    const sermons = at(homeClient, 'id="sermons"');
    const podcasts = at(homeClient, 'id="podcasts"');
    const digitalDj = at(homeClient, 'aria-label="Digital DJ"');

    for (const idx of [daily, videos, music, sermons, podcasts, digitalDj]) {
      expect(idx).toBeGreaterThan(-1);
    }
    expect(daily).toBeLessThan(videos);
    expect(videos).toBeLessThan(music);
    expect(music).toBeLessThan(sermons);
    expect(sermons).toBeLessThan(podcasts);
    expect(podcasts).toBeLessThan(digitalDj);
  });

  it('the Now Playing player carries the id="now-playing" anchor', () => {
    expect(homeClient).toContain('id="now-playing"');
  });

  it("Digital DJ is demoted, not deleted", () => {
    expect(homeClient).toContain("What should we play?");
    expect(homeClient).toContain('href="/digital-dj"');
  });

  it("one click on the Daily Encouragement record starts playback via the shared startItem pipeline", () => {
    expect(homeClient).toMatch(/startItem\(daily\.item\)/);
  });

  it("clicking a video card seeds the continuous queue (not a one-off play)", () => {
    expect(homeClient).toContain("buildVideoQueueFrom(item, itemsOfType(\"music\"))");
  });

  it("provides Shuffle and Repeat controls", () => {
    expect(homeClient).toContain("toggleMainShuffle");
    expect(homeClient).toContain("setMainRepeat");
  });

  it("reuses EncouragementActions rather than re-implementing share/download/source-link", () => {
    expect(homeClient).toContain("<EncouragementActions");
    expect(homeClient).not.toContain("djc_today_viewed"); // that tracking lives inside the reused component, not duplicated here
  });
});

describe("Daily Encouragement selection", () => {
  it("the homepage fetches the same canonical daily pick /today used to show, and never crashes the page if it fails", () => {
    expect(page).toContain("buildDailyEncouragement");
    expect(page).toContain("chicagoDateKey");
    expect(page).toMatch(/catch\s*\{?\s*return null/);
    expect(page).toContain("daily={daily}");
  });
});

describe("single-page menu navigation", () => {
  const anchors: Record<string, string> = {
    "Daily Encouragement": "/#daily-encouragement",
    "Music Videos": "/#videos",
    Music: "/#music",
    Sermons: "/#sermons",
    Podcasts: "/#podcasts",
    "Now Spinning": "/#now-playing",
  };

  for (const [name, href] of Object.entries(anchors)) {
    it(`"${name}" targets the homepage anchor ${href}, not a separate route`, () => {
      const re = new RegExp(`name:\\s*"${name}",\\s*href:\\s*"([^"]+)"`);
      const match = layout.match(re);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(href);
    });
  }

  it("every menu href is an absolute homepage anchor (works from any route), never a bare #hash", () => {
    const hrefs = [...layout.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      if (href.includes("#")) expect(href.startsWith("/#")).toBe(true);
    }
  });
});

describe("/today retirement", () => {
  it("the live /today page is gone — no duplicate Daily Encouragement UI", () => {
    expect(existsSync(join(app, "today/page.tsx"))).toBe(false);
  });

  it("/today permanently redirects to the homepage hero", () => {
    expect(nextConfig).toMatch(/source:\s*"\/today"/);
    expect(nextConfig).toMatch(/destination:\s*"\/#daily-encouragement"/);
    expect(nextConfig).toMatch(/permanent:\s*true/);
  });

  it("the dated archive (a distinct history feature) is untouched", () => {
    expect(existsSync(join(app, "today/[date]/page.tsx"))).toBe(true);
  });
});
