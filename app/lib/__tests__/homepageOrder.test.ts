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
const encouragementActions = readFileSync(join(app, "components/EncouragementActions.tsx"), "utf8");

const at = (haystack: string, needle: string) => haystack.indexOf(needle);

describe("homepage section order", () => {
  it("Music Video of the Day hero leads, then Daily Encouragement, then Videos/Music/Sermons/Podcasts, Digital DJ last", () => {
    // `deck` (id="now-playing") is a const defined well above the return
    // statement and referenced by name where it actually renders — so its
    // render POSITION is this insertion line, not its definition's id=.
    const hero = at(homeClient, 'id="video-of-the-day"');
    // `deck` is a const defined well above the return statement — its
    // render POSITION is where it's actually inserted into the tree.
    const deckInsertion = at(homeClient, "{started && deck}");
    const daily = at(homeClient, 'id="daily-encouragement"');
    const videos = at(homeClient, 'id="videos"');
    const music = at(homeClient, 'id="music"');
    const sermons = at(homeClient, 'id="sermons"');
    const podcasts = at(homeClient, 'id="podcasts"');
    const digitalDj = at(homeClient, 'aria-label="Digital DJ"');

    for (const idx of [hero, deckInsertion, daily, videos, music, sermons, podcasts, digitalDj]) {
      expect(idx).toBeGreaterThan(-1);
    }
    // The whole music experience (hero + its Previous/Next/Shuffle/Repeat/
    // Spin Something Else/Mood Mixes controls) stays grouped together —
    // Daily Encouragement never sits between them.
    expect(hero).toBeLessThan(deckInsertion);
    expect(deckInsertion).toBeLessThan(daily);
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

  it("the hero record's own pick (heroVideo) starts playback via the shared startItem pipeline", () => {
    expect(homeClient).toMatch(/startItem\(heroVideo\)/);
  });

  it("the hero always renders regardless of playback state — Shuffle/other picks never make the record disappear", () => {
    expect(homeClient).toMatch(/tab === "spin" && heroVideo && \(/);
  });

  it("Shuffle swaps the hero's cued pick via the shared pickNext helper, without starting playback", () => {
    expect(homeClient).toContain("shuffleHeroVideo");
    expect(homeClient).toMatch(/eligibleVideosOfTheDay\(\)/);
    // the handler must only ever call setHeroVideo — never startItem/setCurrent
    const fn = homeClient.slice(homeClient.indexOf("const shuffleHeroVideo"), homeClient.indexOf("const shuffleHeroVideo") + 400);
    expect(fn).not.toMatch(/startItem\(/);
  });

  it("Play and Pause replace the record with the inline player in the same hero container — no second video panel is ever mounted", () => {
    expect(homeClient).toContain("videoPanelNode");
    expect(homeClient).toContain('setHeroView("player")');
    expect(homeClient).toContain('setHeroView("record")');
    // exactly one <DJPlayer ...> element in the whole file — reused, not
    // duplicated (the type-only useRef<DJPlayerHandle> doesn't count).
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
  });

  it("Daily Encouragement never seeds the hero record's playback (decoupled)", () => {
    expect(homeClient).not.toMatch(/startItem\(daily\.item\)/);
  });

  it("clicking a video card seeds the continuous queue (not a one-off play)", () => {
    expect(homeClient).toContain("buildVideoQueueFrom(item, itemsOfType(\"music\"))");
  });

  it("provides Shuffle and Repeat controls", () => {
    expect(homeClient).toContain("toggleMainShuffle");
    expect(homeClient).toContain("setMainRepeat");
  });

  it("reuses EncouragementActions in its compact, stay-on-site-first variant rather than re-implementing share/download/source-link", () => {
    expect(homeClient).toContain("<EncouragementActions");
    expect(homeClient).toMatch(/variant="compact"/);
    expect(homeClient).toContain("audioUrl={daily.audioUrl}");
    expect(homeClient).not.toContain("djc_today_viewed"); // that tracking lives inside the reused component, not duplicated here
  });

  it("the deck never shows a second Play/Pause or Share for the item the hero is already showing", () => {
    expect(homeClient).toMatch(/isHeroCurrent \? null : current\?\.videoId/);
    expect(homeClient).toContain("current && !isHeroCurrent && share(mediaShareTarget(current)");
  });
});

describe("Daily Encouragement compact variant: Listen expands into an inline player, source link always visible as fallback", () => {
  it("prefers a direct audio URL (native <audio controls>) over an embed", () => {
    expect(encouragementActions).toContain("audioUrl ? (");
    expect(encouragementActions).toContain("<audio controls");
  });

  it("falls back to the provider embed only when there's no direct audio URL", () => {
    expect(encouragementActions).toContain("<iframe");
  });

  it("Listen is the primary action only when something is actually playable", () => {
    expect(encouragementActions).toContain("const playable = Boolean(audioUrl || embedUrl);");
    expect(encouragementActions).toMatch(/playable && \(\s*<button[^]*?▶ Listen/);
  });

  it("the source link is always visible — never sr-only", () => {
    expect(encouragementActions).not.toContain("djc-sr-only");
    expect(encouragementActions).toContain("Original source ↗");
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
