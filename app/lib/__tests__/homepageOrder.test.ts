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

describe("homepage section order (locked: hero, then Daily Encouragement, then everything else)", () => {
  it("Music Video of the Day hero leads, Daily Encouragement directly beneath it, then the rest of the music deck, then Videos/Music/Sermons/Podcasts, Digital DJ last", () => {
    // `deck` (id="now-playing") is a const defined well above the return
    // statement and referenced by name where it actually renders — so its
    // render POSITION is where it's actually inserted into the tree, not
    // its definition's id=.
    const hero = at(homeClient, 'id="video-of-the-day"');
    const daily = at(homeClient, 'id="daily-encouragement"');
    const deckInsertion = at(homeClient, "{started && deck}");
    const videos = at(homeClient, 'id="videos"');
    const music = at(homeClient, 'id="music"');
    const sermons = at(homeClient, 'id="sermons"');
    const podcasts = at(homeClient, 'id="podcasts"');
    const digitalDj = at(homeClient, 'aria-label="Digital DJ"');

    for (const idx of [hero, daily, deckInsertion, videos, music, sermons, podcasts, digitalDj]) {
      expect(idx).toBeGreaterThan(-1);
    }
    // Owner-locked hierarchy: hero, then Daily Encouragement immediately
    // beneath it, then everything else unchanged. Nothing may be wedged
    // between the hero and Daily Encouragement.
    expect(hero).toBeLessThan(daily);
    expect(daily).toBeLessThan(deckInsertion);
    expect(deckInsertion).toBeLessThan(videos);
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

  it("Daily Encouragement's own pick never becomes the hero record (decoupled) even though both can now call startItem", () => {
    // Owner-directed reversal: Daily Encouragement DOES call startItem now
    // (reusing the Podcasts tab's proven play-here path) — but it must
    // still never be able to claim the hero's vinyl. isHeroCurrent/
    // isDailyCurrent are independent checks against different pools
    // (heroVideo is always music; daily.item is podcast/sermon), so the
    // two can never both be true for the same `current`.
    expect(homeClient).toMatch(/startItem\(daily\.item\)/);
    expect(homeClient).toContain("const isHeroCurrent = Boolean(heroVideo && current?.id === heroVideo.id)");
    expect(homeClient).toContain("const isDailyCurrent = Boolean(daily && current?.id === daily.item.id)");
  });

  it("Daily Encouragement's inline player reuses the exact same startItem → shared player-state pipeline as the Podcasts tab's \"Play here\" — no second audio system", () => {
    // Same button label/pattern as the Podcasts tab (app/HomeClient.tsx
    // Podcasts section), and the same podcastPanelNode (showAudio/showEmbed
    // off shared `current`/`started`) is reused for both, just placed in
    // whichever section owns the item that's actually playing.
    expect(homeClient).toMatch(/onClick=\{\(\) => startItem\(daily\.item\)\} style=\{bigButton\}>▶ Play here</);
    expect(homeClient).toMatch(/onClick=\{\(\) => startItem\(p\)\} style=\{bigButton\}>▶ Play here</);
    expect(homeClient).toContain("const podcastPanelNode = (showAudio || showEmbed) && (");
    expect(homeClient).toMatch(/isDailyCurrent && started \?[\s\S]{0,200}podcastPanelNode/);
  });

  it("a sermon picked as today's Daily Encouragement (a real YouTube video, not just a podcast) also plays inline, reusing videoPanelNode", () => {
    expect(homeClient).toContain("daily.item.videoId || daily.embedUrl || daily.audioUrl");
    expect(homeClient).toMatch(/isHeroCurrent && daily\.item\.videoId \? videoPanelNode : podcastPanelNode/);
  });

  it("prefers a direct verified audioUrl (native <audio controls>) over a provider embed, for whichever item is playing", () => {
    expect(homeClient).toContain("const showAudio = Boolean(started && current && !current.videoId && current.audioUrl);");
    expect(homeClient).toContain("<audio controls");
  });

  it("falls back to the honest official-source link — never a fabricated MP3 — when the picked item has no verified playable audio/embed", () => {
    expect(homeClient).toContain("daily.embedUrl || daily.audioUrl ?");
    expect(homeClient).toContain("Listen at the official source ↗");
  });

  it("clicking a video card seeds the continuous queue (not a one-off play)", () => {
    expect(homeClient).toContain("buildVideoQueueFrom(item, itemsOfType(\"music\"))");
  });

  it("provides Shuffle and Repeat controls", () => {
    expect(homeClient).toContain("toggleMainShuffle");
    expect(homeClient).toContain("setMainRepeat");
  });

  it("reuses EncouragementActions in its compact variant for Share/Download/Browse only — no duplicate playback logic", () => {
    expect(homeClient).toContain("<EncouragementActions");
    expect(homeClient).toMatch(/variant="compact"/);
    expect(homeClient).not.toContain("djc_today_viewed"); // that tracking lives inside the reused component, not duplicated here
  });

  it("the deck never shows a second Play/Pause or Share for the item the hero or Daily Encouragement is already showing", () => {
    expect(homeClient).toMatch(/isHeroCurrent \? null : current\?\.videoId/);
    expect(homeClient).toContain("current && !isHeroCurrent && !isDailyCurrent && share(mediaShareTarget(current)");
  });
});

describe("EncouragementActions: no second audio system", () => {
  it("the compact variant has no player/audio/embed logic of its own — playback lives only in HomeClient's shared pipeline", () => {
    expect(encouragementActions).not.toContain("<audio");
    expect(encouragementActions).not.toContain("<iframe");
    expect(encouragementActions).not.toContain("audioUrl");
    expect(encouragementActions).not.toContain("embedUrl");
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
