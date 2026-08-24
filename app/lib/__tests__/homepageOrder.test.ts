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

  it("Play and Pause replace the record with the inline player in the same hero container — the shared deck never mounts a second copy of it", () => {
    expect(homeClient).toContain("videoPanelNode");
    expect(homeClient).toContain('setHeroView("player")');
    expect(homeClient).toContain('setHeroView("record")');
    // exactly two <DJPlayer ...> elements in the whole file: the shared
    // hero/deck instance, and Daily Encouragement's own fully-local one
    // (see the "entirely local player" describe block below) — neither
    // is a duplicate of the other, they're two intentionally separate
    // player instances (the type-only useRef<DJPlayerHandle> doesn't
    // count towards this).
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(2);
  });

  it("Daily Encouragement's pick can never become the hero record — independent pools, and Daily Encouragement no longer touches `current` at all", () => {
    expect(homeClient).toContain("const isHeroCurrent = Boolean(heroVideo && current?.id === heroVideo.id)");
    expect(homeClient).not.toContain("isDailyCurrent"); // removed entirely — no longer meaningful
    expect(homeClient).toContain("const [dailyPick, setDailyPick] = useState<MediaItem | null>(initialDailyPick)");
  });

  it("prefers a direct verified audioUrl (native <audio controls>) over a provider embed, for whichever item is playing in the shared deck (e.g. a podcast played from the Podcasts tab)", () => {
    expect(homeClient).toContain("const showAudio = Boolean(started && current && !current.videoId && current.audioUrl);");
    expect(homeClient).toContain("<audio controls");
  });

  it("shows only the small honest \"Original source ↗\" link — never a giant CTA, never a fabricated MP3 — and it always points at whatever's currently displayed", () => {
    expect(homeClient).not.toContain("Listen at the official source ↗");
    expect(homeClient).toContain("Original source ↗");
    expect(homeClient).toContain("href={getWatchUrl(dailyPick)}");
  });

  it("ONE card, no \"today's pick vs spun pick\" concept — Spin replaces this same card's contents in place, no second card, no Back button, never starts playback itself", () => {
    expect(homeClient).toContain("🔀 Spin another");
    expect(homeClient).not.toContain("Spin a sermon or podcast"); // stale multi-card copy
    expect(homeClient).not.toContain("Back to today"); // no "Back to today's pick" control
    expect(homeClient).not.toContain("spun for you"); // no "spun pick" language
    expect(homeClient).toContain("spinPool({ category: \"sermon\" })");
    expect(homeClient).toContain("spinPool({ category: \"podcast\" })");
    const fn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 500);
    expect(fn).not.toMatch(/startItem\(/);
    expect(fn).toContain("setDailyPick");
  });

  it("Daily Encouragement no longer renders EncouragementActions — one lean card (title, Play here, Original source, Spin another, quiet Share) replaces it", () => {
    expect(homeClient).not.toContain("<EncouragementActions");
    expect(homeClient).not.toContain("import EncouragementActions");
  });

  it("REGRESSION: the homepage's starting Daily Encouragement pick always comes from the playable-only selector, so Play here is guaranteed on initial load", () => {
    expect(homeClient).toContain("dailyPick: initialDailyPick = null");
    expect(homeClient).toContain("dailyPick?: MediaItem | null");
    // isPlayable(dailyPick) gates the button, and the selection itself
    // (homeDailyPick.test.ts) guarantees dailyPick is always isPlayable —
    // together these mean "Play here" is never absent on load.
    expect(homeClient).toContain("isPlayable(dailyPick) && (");
    expect(homeClient).toContain("▶ Play here");
  });

  it("REGRESSION: Spin another always draws from the isPlayable-filtered spin pool — same guarantee the initial selection makes", () => {
    // spinPool (app/lib/spin.ts) filters every category through isPlayable()
    // already — see spin.test.ts / homeDailyPick.test.ts for the guarantee
    // that isPlayable() itself never passes a link-out-only item.
    const fn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 500);
    expect(fn).toContain("spinPool({ category: \"sermon\" })");
    expect(fn).toContain("spinPool({ category: \"podcast\" })");
    expect(fn).toContain("pickNext(pool, historyRef.current)");
  });

  it("isPlayable() covers a direct audioUrl too, so the spin pool (which filters on it) never lands on a link-out-only item", () => {
    const lib = readFileSync(join(app, "lib/djCaresLibrary.ts"), "utf8");
    expect(lib).toContain("Boolean(item.videoId || item.spotifyEmbed || item.appleEmbed || item.audioUrl)");
  });

  it("clicking a video card seeds the continuous queue (not a one-off play)", () => {
    expect(homeClient).toContain("buildVideoQueueFrom(item, itemsOfType(\"music\"))");
  });

  it("provides Shuffle and Repeat controls", () => {
    expect(homeClient).toContain("toggleMainShuffle");
    expect(homeClient).toContain("setMainRepeat");
  });

  it("the deck never shows a second Play/Pause or Share for the item the hero is already showing", () => {
    expect(homeClient).toMatch(/isHeroCurrent \? null : current\?\.videoId/);
    expect(homeClient).toContain("current && !isHeroCurrent && share(mediaShareTarget(current)");
  });
});

describe("Daily Encouragement player is entirely local — never the shared deck/Now Spinning", () => {
  it("REGRESSION 1: Play here never calls startItem() — the card has its own local play state, so it can never trigger the shared deck", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"') - 200, homeClient.indexOf("Original source ↗") + 400);
    expect(section).not.toMatch(/startItem\(/);
    expect(section).toContain("setDailyExpanded(true)");
    expect(section).toContain("setDailyPlaying(true)");
  });

  it("REGRESSION 11: no Music Videos / Mood Mixes / Spin Something Else UI is reachable from Daily Encouragement's own handlers", () => {
    // The card's handlers (spinDailyPick, the Play here onClick) never
    // reference `started`, `setStarted`, `setMoodQueue`, or `spin` (the
    // global "Spin Something Else" handler) — those only exist in the
    // shared deck, which Daily Encouragement's local state can't reach.
    const spinFn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 700);
    expect(spinFn).not.toMatch(/\bsetStarted\b|\bsetMoodQueue\b|\bsetMainQueue\b/);
  });

  it("REGRESSION 8/9: compact 16:9 preview exists before expanded playback, and Play here expands that SAME box in place — not a second player", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(section).toContain("dailyExpanded ? (");
    expect(section).toContain('aspectRatio: "16 / 9"'); // compact preview box
    expect(section).toContain("🎧"); // fallback preview icon for a podcast with no video thumbnail
    // Exactly one DJPlayer / one audio / one iframe branch inside this one
    // conditional — never two rendered at once.
    expect(section.match(/<DJPlayer/g)?.length).toBe(1);
  });

  it("REGRESSION 10: Daily Encouragement's video player gets initialVolume 25, not the shared site-level volume control", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(section).toContain("initialVolume={25}");
  });

  it("REGRESSION 6/7: spinning resets this card's player (stops playback) and never autoplays the new pick", () => {
    const fn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 700);
    expect(fn).toContain("setDailyExpanded(false)");
    expect(fn).toContain("setDailyPlaying(false)");
    expect(fn).not.toMatch(/setDailyPlaying\(true\)/); // never autoplays
  });

  it("REGRESSION 4/5: the current item's id is filtered out of the spin pool BEFORE picking — a deterministic exclusion, not left to chance", () => {
    const fn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 700);
    expect(fn).toMatch(/\.filter\(\s*\(i\) => !unavailable\.has\(i\.id\) && i\.id !== dailyPick\?\.id,?\s*\)/);
    // pickNext is only ever called on the already-current-excluded pool —
    // it has no way to reintroduce the current item.
    const filterIdx = fn.indexOf(".filter(");
    const pickIdx = fn.indexOf("pickNext(pool");
    expect(pickIdx).toBeGreaterThan(filterIdx);
  });

  it("REGRESSION 2/3: the spin pool is sermon + podcast only, and every candidate passes the canonical isPlayable() check (spinPool's own guarantee — see spin.test.ts)", () => {
    const fn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 700);
    expect(fn).toContain('spinPool({ category: "sermon" })');
    expect(fn).toContain('spinPool({ category: "podcast" })');
    expect(fn).not.toMatch(/spinPool\(\{ category: "music"/);
    expect(fn).not.toMatch(/spinPool\(\{ category: "playlist"/);
    expect(fn).not.toMatch(/spinPool\(\{ category: "all"/);
    expect(fn).not.toMatch(/spinPool\(\{ category: "videos"/);
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
  it("the homepage uses the playable-only selector (never the full /today rotation, which can land on a link-out-only item), and never crashes the page if it fails", () => {
    expect(page).toContain("selectHomeDailyPick");
    expect(page).not.toMatch(/import.*buildDailyEncouragement/);
    expect(page).toContain("chicagoDateKey");
    expect(page).toMatch(/catch\s*\{?\s*return null/);
    expect(page).toContain("dailyPick={dailyPick}");
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
