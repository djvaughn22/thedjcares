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

describe("homepage section presence (locked: every section exists; VISUAL order is governed by CSS `order`, not source position — see the \"Home and category-tab visual order\" describe block below for the authoritative ordering tests)", () => {
  it("every homepage section exists in the file, all as siblings inside the same flex column (activePlayerNode is a const referenced once, well below its definition, so its render POSITION — not its definition — is what's checked)", () => {
    const nav = at(homeClient, 'aria-label="Category tabs"');
    const playerInsertion = at(homeClient, "{started && activePlayerNode}");
    const hero = at(homeClient, 'id="video-of-the-day"');
    const daily = at(homeClient, 'id="daily-encouragement"');
    const music = at(homeClient, 'id="music"');
    const videos = at(homeClient, 'id="videos"');
    const sermons = at(homeClient, 'id="sermons"');
    const podcasts = at(homeClient, 'id="podcasts"');
    const digitalDj = at(homeClient, 'aria-label="Digital DJ"');

    for (const idx of [nav, playerInsertion, hero, daily, music, videos, sermons, podcasts, digitalDj]) {
      expect(idx).toBeGreaterThan(-1);
    }
  });

  it('the shared deck still carries the id="now-playing" anchor for non-video playback (e.g. a sermon/podcast started from browse content)', () => {
    expect(homeClient).toContain('id="now-playing"');
  });

  it("Digital DJ is demoted, not deleted", () => {
    expect(homeClient).toContain("What should we play?");
    expect(homeClient).toContain('href="/digital-dj"');
  });

  it("the hero's idle Play button starts the cued heroVideo via the shared startItem pipeline", () => {
    expect(homeClient).toMatch(/startItem\(heroVideo\)/);
  });

  it("the hero always renders regardless of playback state — Shuffle/other picks never make the record disappear", () => {
    expect(homeClient).toMatch(/tab === "spin" && heroDisplayItem && \(/);
  });

  it("Shuffle swaps the hero's cued pick via the shared pickNext helper, without starting playback", () => {
    expect(homeClient).toContain("shuffleHeroVideo");
    expect(homeClient).toMatch(/eligibleVideosOfTheDay\(\)/);
    // the handler must only ever call setHeroVideo — never startItem/setCurrent
    const fn = homeClient.slice(homeClient.indexOf("const shuffleHeroVideo"), homeClient.indexOf("const shuffleHeroVideo") + 400);
    expect(fn).not.toMatch(/startItem\(/);
  });

  it("the hero is a pure cue/discovery widget — it never embeds its own video, so there's exactly one place any video actually mounts (the persistent player), not a second copy that would need to survive a tab-to-tab move", () => {
    expect(homeClient).toContain("videoPanelNode");
    expect(homeClient).not.toContain("heroView"); // retired — no more record⇄player swap inside the hero
    expect(homeClient).not.toContain('setHeroView("player")');
    expect(homeClient).not.toContain('setHeroView("record")');
    // exactly one <DJPlayer ...> element in the whole file — Daily
    // Encouragement no longer mounts a second, fully-local instance (see
    // the "Home cards are selectors, not players" describe block below);
    // the type-only useRef<DJPlayerHandle> doesn't count towards this.
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
  });

  it("REGRESSION: isHeroCurrent covers ANY currently-playing music video (not just the exact cued heroVideo pick) — a Music Videos preview card, a mood mix, or a vibe spin all merge into the SAME video deck instead of opening a second Now Spinning video player", () => {
    expect(homeClient).toContain(
      "const isHeroCurrent = Boolean(current && current.type === \"music\" && current.videoId);",
    );
    expect(homeClient).toContain("const heroDisplayItem = isHeroCurrent && current ? current : heroVideo;");
    expect(homeClient).not.toContain("isDailyCurrent"); // removed entirely — no longer meaningful
    expect(homeClient).toContain("const [dailyPick, setDailyPick] = useState<MediaItem | null>(initialDailyPick)");
  });

  it("REGRESSION (superseded): the shared transport (Prev/Next/Play-Pause/Shuffle/Repeat/Spin Something Else/Share/Volume/blocked-recovery/queue-status) is a single transportPanel node, rendered exactly once inside the one persistent player — never duplicated into the hero", () => {
    expect(homeClient).toContain("const transportPanel = (");
    // referenced exactly once: inside activePlayerNode's own JSX (`{transportPanel}`).
    expect(homeClient.match(/\{transportPanel\}/g)?.length).toBe(1);
    expect(homeClient).not.toContain("{isHeroStarted && transportPanel}");
  });

  it("prefers a direct verified audioUrl (native <audio controls>, wrapped in SyncedAudio for shared-volume sync) over a provider embed, for whichever item is playing in the shared deck (e.g. a podcast played from the Podcasts tab)", () => {
    expect(homeClient).toContain("const showAudio = Boolean(started && current && !current.videoId && current.audioUrl);");
    expect(homeClient).toMatch(/<SyncedAudio\s[\s\S]*?\bcontrols\b/);
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

  it("REGRESSION (superseded): the hero no longer has its own Play/Pause/Share for the playing item — the persistent player's transportPanel is the only transport control, so there's nothing left for a hero copy to duplicate", () => {
    expect(homeClient).not.toMatch(/isHeroCurrent \? null : current\?\.videoId/);
    expect(homeClient).toContain("current?.videoId && started && !blocked ? (");
    expect(homeClient).toContain("{current && share(mediaShareTarget(current), \"deck\")}");
  });
});

describe("Home and category-tab visual order (locked: CSS `order`, not source position, decides what the listener actually sees)", () => {
  // The whole content column is a CSS flex column — every top-level
  // section carries an explicit `order`, so source position in the file no
  // longer determines what renders first. These tests read the numeric
  // order values themselves and prove they encode the required sequence.
  const homeOrderIdx = homeClient.indexOf("const HOME_ORDER = {");
  const homeOrderEnd = homeClient.indexOf("} as const;", homeOrderIdx);
  const homeOrderSrc = homeClient.slice(homeOrderIdx, homeOrderEnd);
  const browseOrderIdx = homeClient.indexOf("const BROWSE_ORDER = {");
  const browseOrderEnd = homeClient.indexOf("} as const;", browseOrderIdx);
  const browseOrderSrc = homeClient.slice(browseOrderIdx, browseOrderEnd);

  const readOrderValue = (src: string, key: string): number => {
    const m = src.match(new RegExp(`\\b${key}:\\s*(\\d+)`));
    if (!m) throw new Error(`order key "${key}" not found`);
    return Number(m[1]);
  };

  it("the content column is a real flex container, so `order` actually takes effect", () => {
    expect(homeClient).toMatch(/maxWidth: 760, margin: "0 auto"[\s\S]*?display: "flex", flexDirection: "column"/);
  });

  it('REGRESSION: Home\'s locked order is Intro < Video of the Day < Daily Encouragement < The Music < category tabs < remaining content — the tabs never appear before the hero', () => {
    const intro = readOrderValue(homeOrderSrc, "intro");
    const hero = readOrderValue(homeOrderSrc, "hero");
    const daily = readOrderValue(homeOrderSrc, "daily");
    const music = readOrderValue(homeOrderSrc, "music");
    const nav = readOrderValue(homeOrderSrc, "nav");
    const musicVideosPreview = readOrderValue(homeOrderSrc, "musicVideosPreview");
    const rest = readOrderValue(homeOrderSrc, "rest");

    expect(intro).toBeLessThan(hero);
    expect(hero).toBeLessThan(daily);
    expect(daily).toBeLessThan(music);
    expect(music).toBeLessThan(nav); // category buttons never appear before the video hero
    expect(nav).toBeLessThan(musicVideosPreview);
    expect(musicVideosPreview).toBeLessThan(rest);
  });

  it('REGRESSION: every browsing tab (Music/Videos/Sermons/Podcasts) is ordered Intro < category tabs < heading/description/filters < full player < library/cards — the full player never appears before the heading', () => {
    const intro = readOrderValue(browseOrderSrc, "intro");
    const nav = readOrderValue(browseOrderSrc, "nav");
    const heading = readOrderValue(browseOrderSrc, "heading");
    const player = readOrderValue(browseOrderSrc, "player");
    const cards = readOrderValue(browseOrderSrc, "cards");

    expect(intro).toBeLessThan(nav);
    expect(nav).toBeLessThan(heading);
    expect(heading).toBeLessThan(player);
    expect(player).toBeLessThan(cards);
  });

  it("REGRESSION: on Home, the nav's own order flips to HOME_ORDER.nav (after the hero/Daily/Music triad); on every other tab it stays BROWSE_ORDER.nav (right after the intro, leading that tab's content, unchanged from before)", () => {
    expect(homeClient).toContain('order: tab === "spin" ? HOME_ORDER.nav : BROWSE_ORDER.nav');
  });

  it("REGRESSION: the hero, Daily Encouragement, The Music, and the Music Videos preview sections each carry their own fixed HOME_ORDER value — none of them depend on which tab is active (they only ever render on tab===\"spin\" anyway) or on what's currently playing", () => {
    expect(homeClient).toContain("order: HOME_ORDER.hero");
    expect(homeClient).toContain("order: HOME_ORDER.daily");
    expect(homeClient).toContain("order: HOME_ORDER.music");
    expect(homeClient).toContain("order: HOME_ORDER.musicVideosPreview");
    expect(homeClient).toContain("order: HOME_ORDER.rest");
  });

  it("REGRESSION: the persistent player's own `order` is computed from what's actually playing — HOME_ORDER.hero/daily/music on Home (so it visually sits at whichever widget owns the current item, never as a separate block above everything), and a single BROWSE_ORDER.player slot (between heading and cards) on every browsing tab", () => {
    const start = homeClient.indexOf("const playerOrder =");
    const end = homeClient.indexOf(";", homeClient.indexOf("BROWSE_ORDER.player", start));
    const src = homeClient.slice(start, end);
    expect(src).toContain("HOME_ORDER.hero");
    expect(src).toContain("HOME_ORDER.daily");
    expect(src).toContain("HOME_ORDER.music");
    expect(src).toContain("BROWSE_ORDER.player");
  });

  it("REGRESSION: `order` is a pure CSS paint-order property applied to playerOuterStyle (the persistent player's one stable wrapper) — it's never used to conditionally include/exclude the player from the tree, so this reordering can't reparent or remount DJPlayer/SyncedAudio/the embed iframe", () => {
    expect(homeClient).toContain("style={playerOuterStyle}");
    const start = homeClient.indexOf("const playerOuterStyle: React.CSSProperties =");
    const end = homeClient.indexOf("const playerInnerStyle", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain("order: playerOrder");
    // Still exactly one mounted instance of each provider — reconfirmed
    // after the reordering rework.
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });

  it("REGRESSION: each of the 4 browsing tabs (Music, Videos, Sermons, Podcasts) splits its content into a heading/filters block (BROWSE_ORDER.heading) and a library/cards block (BROWSE_ORDER.cards) — the player's BROWSE_ORDER.player slot sits between them, so it can never render before that tab's own heading", () => {
    for (const tabId of ["music", "videos", "podcasts", "sermons"]) {
      const tabIdx = homeClient.indexOf(`{tab === "${tabId}" && (`);
      expect(tabIdx, `tab "${tabId}"`).toBeGreaterThan(-1);
      const section = homeClient.slice(tabIdx, tabIdx + 2200);
      expect(section, `tab "${tabId}" heading block`).toContain("order: BROWSE_ORDER.heading");
      expect(section, `tab "${tabId}" cards block`).toMatch(/order: BROWSE_ORDER\.cards|BROWSE_ORDER\.cards/);
    }
  });

  it("Ministries, Churches, and About each get a real order value too (BROWSE_ORDER.heading) — none of them default to CSS order:0, which would otherwise jump them above the intro/nav", () => {
    const ministriesIdx = homeClient.indexOf('{tab === "ministries" && (');
    const churchesIdx = homeClient.indexOf('{tab === "churches" && (');
    const aboutIdx = homeClient.indexOf('{tab === "about" && (');
    for (const idx of [ministriesIdx, churchesIdx, aboutIdx]) {
      expect(idx).toBeGreaterThan(-1);
      expect(homeClient.slice(idx, idx + 120)).toContain("order: BROWSE_ORDER.heading");
    }
  });
});

describe("Daily Encouragement is a selector card — Play here routes into the one persistent player, never a second local one", () => {
  it("REGRESSION 1 (superseded): Play here always calls startItem() — Daily Encouragement has no local play state of its own anymore, so pressing Play IS triggering the one persistent player", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"') - 200, homeClient.indexOf("Original source ↗") + 400);
    expect(section).toContain("startItem(dailyPick)");
    expect(section).not.toContain("setDailyExpanded");
    expect(section).not.toContain("setDailyPlaying");
  });

  it("REGRESSION 8/9 (superseded): the compact 16:9 preview is shown until this pick is actually current, then a plain 'now playing above' note replaces it — never a second embedded player", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(section).toContain("dailyIsCurrent ? (");
    expect(section).toContain("Now playing in the player above");
    expect(section).toContain('aspectRatio: "16 / 9"'); // compact preview box
    expect(section).toContain("🎧"); // fallback preview icon for a podcast with no video thumbnail
    // No DJPlayer/SyncedAudio/iframe mounted inside the card itself.
    expect(section).not.toContain("<DJPlayer");
    expect(section).not.toContain("<SyncedAudio");
    expect(section).not.toContain("<iframe");
  });

  it("REGRESSION 10 (superseded): Daily Encouragement no longer renders its own volume control — the one persistent player's transportPanel already shows it, right above this card", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(section).not.toContain("initialVolume");
    expect(section).not.toContain("volumeControl(");
    expect(section).not.toContain("prefs.volume");
  });

  it("REGRESSION 6/7 (superseded): spinning re-cues a different pick without touching playback — if the outgoing pick was actually playing, it keeps playing in the persistent player (same 'shuffle never stops playback' pattern the hero and Music widget already use)", () => {
    const fn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 700);
    expect(fn).toContain("setDailyPick(next)");
    expect(fn).not.toMatch(/startItem\(/); // never autoplays the new pick
    expect(fn).not.toContain("setDailyExpanded");
    expect(fn).not.toContain("setDailyPlaying");
  });

  it("REGRESSION 11: no Music Videos / Mood Mixes UI is reachable from spinDailyPick — it only ever re-cues dailyPick", () => {
    const spinFn = homeClient.slice(homeClient.indexOf("const spinDailyPick"), homeClient.indexOf("const spinDailyPick") + 700);
    expect(spinFn).not.toMatch(/\bsetMoodQueue\b|\bsetMainQueue\b/);
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

describe("Video Deck: filters collapsed by default, Spin scoped to music videos only", () => {
  it("REGRESSION 4: video Spin/Mood/Vibe only ever draws from music videos — never sermons, podcasts, or playlists", () => {
    // shuffleHeroVideo → eligibleVideosOfTheDay() (type "music" + videoId
    // only, see videoOfTheDay.test.ts). "Tune the spin" Mood chips →
    // startMoodMix(mood, "videos") (moodQueue.ts's mode "videos" filters
    // to isMusicVideo() only, see moodQueue.ts). Vibe chips →
    // spinVideoByVibe, scoped to spinPool's "videos" category.
    const fn = homeClient.slice(homeClient.indexOf("const spinVideoByVibe"), homeClient.indexOf("const spinVideoByVibe") + 500);
    expect(fn).toContain('spinPool({ category: "videos", vibe: v })');
    expect(homeClient).toContain('startMoodMix(mood, "videos")');
  });

  it("REGRESSION 8/9/11: Mood Mixes / Mix Type / What should I spin? / Choose a vibe no longer exist as a permanent button wall — replaced by one closed-by-default \"Tune the spin\" disclosure inside the Video Deck", () => {
    expect(homeClient).not.toContain("Mood mixes");
    expect(homeClient).not.toContain("Mix type");
    expect(homeClient).not.toContain("What should I spin?");
    expect(homeClient).not.toContain("Choose a vibe");
    expect(homeClient).toContain("Tune the spin");
    expect(homeClient).toContain("const [tuneSpinOpen, setTuneSpinOpen] = useState(false)");
    expect(homeClient).toMatch(/setTuneSpinOpen\(\(v\) => !v\)/);
  });

  it("the Tune the spin disclosure reuses the real QUEUE_MOODS/VIBES lists, not an invented taxonomy", () => {
    expect(homeClient).toContain("{QUEUE_MOODS.map((mood) =>");
    expect(homeClient).toContain("{VIBES.map((v) =>");
  });
});

describe("Music Deck: THE MUSIC widget is a selector/featured card — Play routes into the one persistent player, never its own iframe", () => {
  it("REGRESSION 7 (superseded): the Music widget's Play button goes through the authoritative startItem pipeline — the real Apple embed only ever mounts in the one persistent player (podcastPanelNode)", () => {
    expect(homeClient).not.toContain("const [musicExpanded, setMusicExpanded] = useState(false)");
    expect(homeClient).not.toContain("const [musicPlaying, setMusicPlaying] = useState(false)");
    const section = homeClient.slice(homeClient.indexOf('id="music" aria-label="The Music"'), homeClient.indexOf('id="videos" aria-label="Music Videos preview"'));
    expect(section).toContain("startItem(heroPlaylist)");
    expect(section).not.toContain("<iframe"); // no local embed — see podcastPanelNode
  });

  it("compact cover-artwork preview is shown until this playlist is actually current, then a plain 'now playing above' note replaces it — never a second embedded player", () => {
    const section = homeClient.slice(homeClient.indexOf('id="music" aria-label="The Music"'), homeClient.indexOf('id="videos" aria-label="Music Videos preview"'));
    expect(section).toContain("musicIsCurrent ? (");
    expect(section).toContain("Now playing in the player above");
    expect(section).toContain('aspectRatio: "1"'); // square cover-art preview, not a 16:9 video box
    expect(section.match(/<iframe/g)).toBeNull(); // no iframe mounted here at all
  });

  it("REGRESSION 9: Choose a mix is a closed-by-default disclosure, not a permanent row of playlist buttons", () => {
    expect(homeClient).toContain("const [chooseMixOpen, setChooseMixOpen] = useState(false)");
    expect(homeClient).toContain("Choose a mix");
    expect(homeClient).toMatch(/setChooseMixOpen\(\(v\) => !v\)/);
  });

  it("Another mix excludes the currently shown playlist before picking, and never fakes control over the embed's own volume", () => {
    const fn = homeClient.slice(homeClient.indexOf("const spinMusicMix"), homeClient.indexOf("const spinMusicMix") + 500);
    expect(fn).toMatch(/\.filter\(\(p\) => p\.id !== heroPlaylistId\)/);
    expect(homeClient).not.toMatch(/heroPlaylist\.(volume|setVolume)/);
  });
});

describe("REGRESSION (superseded): the old three-way deck coordinator is retired — `current` is now the single source of truth for what's playing, so there's nothing left to coordinate", () => {
  it("the old three-way coordinator state no longer exists — Video/Daily/Music no longer have independent 'am I playing' state to reconcile against each other (a plain-English comment explaining why is fine — the actual useState/setter/useEffect wiring is gone)", () => {
    expect(homeClient).not.toMatch(/useState<"video" \| "daily" \| "music" \| null>/);
    expect(homeClient).not.toContain("setActiveDeck");
    expect(homeClient).not.toMatch(/if \(dailyPlaying\) setActiveDeck/);
    expect(homeClient).not.toMatch(/if \(musicPlaying\) setActiveDeck/);
  });

  it("Home cards (hero, Daily Encouragement, Music widget) each derive their own 'is this what's playing' flag straight from `current`/`started` — isHeroCurrent, dailyIsCurrent, musicIsCurrent — instead of maintaining separate playing booleans", () => {
    expect(homeClient).toContain("const isHeroCurrent = Boolean(current && current.type === \"music\" && current.videoId);");
    expect(homeClient).toContain("const dailyIsCurrent = Boolean(started && current && dailyPick && current.id === dailyPick.id);");
    expect(homeClient).toContain("const musicIsCurrent = Boolean(started && current && heroPlaylist && current.id === heroPlaylist.id);");
  });

  it("exclusivity is structural, not coordinated: starting any new item calls startItem, which replaces the single `current` value — there is no code path that lets two items be `current` at once", () => {
    const fn = homeClient.slice(homeClient.indexOf("const startItem = "), homeClient.indexOf("const startItem = ") + 2000);
    // setCurrent is called with exactly the new item — never merged with
    // or appended to a previous value.
    expect(fn).toMatch(/setCurrent\(item\)/);
  });
});

describe("Persistent player: one continuous listening experience across Music, Videos, Sermons, and Podcasts", () => {
  it("REGRESSION: the persistent player's insertion point (`{started && activePlayerNode}`) is not wrapped in any tab==='...' conditional — it renders on every tab, not just one", () => {
    const idx = homeClient.indexOf("{started && activePlayerNode}");
    expect(idx).toBeGreaterThan(-1);
    const before = homeClient.slice(Math.max(0, idx - 60), idx);
    expect(before).not.toMatch(/tab === "/);
  });

  it("REGRESSION: switching category tabs can never stop or reset playback — goTab (the only tab-switch path) only ever touches `tab`, browser history, and scroll position", () => {
    const fn = homeClient.slice(homeClient.indexOf("const goTab = "), homeClient.indexOf("const goTab = ") + 400);
    expect(fn).toContain("setTab(t)");
    // Never clears the current item, the queue, playback state, progress,
    // or preferences — a tab click is purely a view change.
    expect(fn).not.toMatch(/setCurrent\(|setStarted\(|setPlaying\(|setProgress\(|setMainQueue\(|setMoodQueue\(|setPrefs\(|updatePrefs\(/);
  });

  it("REGRESSION: goTab never does a full page navigation — it's a client-side history update (pushState), not a location assignment or reload", () => {
    const fn = homeClient.slice(homeClient.indexOf("const goTab = "), homeClient.indexOf("const goTab = ") + 400);
    expect(fn).toContain("window.history.pushState(");
    expect(fn).not.toMatch(/window\.location(\.href)?\s*=|location\.assign\(|location\.reload\(/);
  });

  it("REGRESSION: Back/Forward can change the selected category without destroying playback — goTab pushes a real, traversable history entry (not replaceState), and the hashchange listener re-derives `tab` from the URL on every Back/Forward, falling back to Home on an empty hash", () => {
    expect(homeClient).not.toMatch(/window\.history\.replaceState\(null, "", t === "spin"/);
    expect(homeClient).toContain('window.history.pushState(null, "", t === "spin"');
    expect(homeClient).toContain('if (h === "") setTab("spin");');
  });

  it("REGRESSION: exactly one videoPanelNode and one podcastPanelNode call site in the whole file — the same DJPlayer/SyncedAudio/iframe instance is what's current, on whichever tab you're on, never a second copy per tab", () => {
    expect(homeClient.match(/\{videoPanelNode\}/g)?.length).toBe(1);
    expect(homeClient.match(/\{podcastPanelNode\}/g)?.length).toBe(1);
  });

  it("REGRESSION: a Spotify/Apple embed's <iframe>, and native <audio> via SyncedAudio, are both defined once inside podcastPanelNode, outside every tab==='...' conditional — neither is torn down or re-created by a category change", () => {
    const start = homeClient.indexOf("const podcastPanelNode = ");
    const end = homeClient.indexOf("\n  );", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain("<SyncedAudio");
    expect(src).toContain("<iframe");
    expect(src).not.toMatch(/tab === "/);
  });

  it("selecting a new item always replaces `current` via the authoritative startItem pipeline — the previous source stops because the one persistent player is driven by that single value, never a second concurrent one", () => {
    const fn = homeClient.slice(homeClient.indexOf("const startItem = "), homeClient.indexOf("const startItem = ") + 2000);
    expect(fn).toContain("setCurrent(item)");
    expect(fn).toContain("setStarted(true)");
    expect(fn).toContain("setPlaying(true)");
  });

  it("REGRESSION: volume/mute preferences survive every category transition — the persistent player reads them straight from the shared `prefs` state, which goTab never touches (see the goTab test above)", () => {
    expect(homeClient).toContain("volume={prefs.volume}");
    expect(homeClient).toContain("muted={prefs.muted}");
  });

  it("the category tabs are the one client-side navigation path — every button calls goTab, none of them is a plain <a href> to a different route", () => {
    const navIdx = homeClient.indexOf('aria-label="Category tabs"');
    const navEnd = homeClient.indexOf("</nav>", navIdx);
    const navSrc = homeClient.slice(navIdx, navEnd);
    expect(navSrc).toContain("onClick={() => goTab(t.id)}");
    expect(navSrc).not.toContain("<a ");
  });

  it("category tabs use standard <button> elements with aria-current marking the active one — natively keyboard-operable (Tab to focus, Enter/Space to activate), no custom key handling needed", () => {
    const navIdx = homeClient.indexOf('aria-label="Category tabs"');
    const navEnd = homeClient.indexOf("</nav>", navIdx);
    const navSrc = homeClient.slice(navIdx, navEnd);
    expect(navSrc).toContain("<button");
    expect(navSrc).toContain('aria-current={tab === t.id ? "page" : undefined}');
  });

  it("a direct entry to a category initializes normally but never autoplays without a user action — `started` (which gates the persistent player and any DJPlayer/SyncedAudio mount) only ever becomes true inside startItem, which itself is only ever invoked from onClick handlers, not from a mount effect", () => {
    expect(homeClient).toContain("const [started, setStarted] = useState(false)");
    // The only place `started` is ever set true is inside startItem.
    expect(homeClient.match(/setStarted\(true\)/g)?.length).toBe(1);
    const startItemIdx = homeClient.indexOf("const startItem = ");
    expect(homeClient.indexOf("setStarted(true)")).toBeGreaterThan(startItemIdx);
  });
});

describe("Gap closed: Daily Encouragement and the Home Apple Music widget are selectors now, not independent playback authorities", () => {
  it("REGRESSION: starting Daily Encouragement uses the SAME startItem call (and therefore the SAME activePlayerNode/DJPlayer/SyncedAudio/podcastPanelNode instance) as every other pick — switching through Music, Videos, Sermons, and Podcasts can't unmount it because it was never nested in a tab==='...' conditional to begin with", () => {
    const dailySection = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(dailySection).toContain("startItem(dailyPick)");
    // No local player of any kind lives in the card.
    expect(dailySection).not.toContain("<DJPlayer");
    expect(dailySection).not.toContain("<SyncedAudio");
    expect(dailySection).not.toContain("<iframe");
    // The actual player it starts is the one persistent instance, defined
    // once, outside every tab conditional (see the "persistent player"
    // describe block above for the full non-unmounting proof).
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/\{videoPanelNode\}/g)?.length).toBe(1);
    expect(homeClient.match(/\{podcastPanelNode\}/g)?.length).toBe(1);
  });

  it("REGRESSION: starting a Home Apple playlist uses the SAME startItem call as every other pick — the actual <iframe> only ever mounts inside podcastPanelNode (one call site, outside every tab conditional), so it's the same mounted instance across every category tab, including Home itself", () => {
    const musicSection = homeClient.slice(homeClient.indexOf('id="music" aria-label="The Music"'), homeClient.indexOf('id="videos" aria-label="Music Videos preview"'));
    expect(musicSection).toContain("startItem(heroPlaylist)");
    expect(musicSection).not.toContain("<iframe");
    // Exactly one <iframe> exists anywhere in the file — podcastPanelNode's.
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
    const podcastPanelStart = homeClient.indexOf("const podcastPanelNode = ");
    const podcastPanelEnd = homeClient.indexOf("\n  );", podcastPanelStart);
    const iframeIdx = homeClient.indexOf("<iframe");
    expect(iframeIdx).toBeGreaterThan(podcastPanelStart);
    expect(iframeIdx).toBeLessThan(podcastPanelEnd);
  });

  it("REGRESSION: the Music tab's playlist browse grid (PlaylistCard) is also a selector, not a live embed — one Play-here button per card, no iframe, so browsing several playlists never means several are playable at once", () => {
    const start = homeClient.indexOf("const PlaylistCard = ");
    const end = homeClient.indexOf("\n  };", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain("startItem(p)");
    expect(src).not.toContain("<iframe");
  });

  it("REGRESSION: the Home tab's Podcasts preview cards are also selectors, not live embeds — same Play-here-via-startItem pattern as the Podcasts browsing tab, no per-card iframe", () => {
    const start = homeClient.indexOf('<section id="podcasts">');
    const end = homeClient.indexOf("</section>", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain("startItem(p)");
    expect(src).not.toContain("<iframe");
  });

  it("REGRESSION: exactly one playable provider surface of each kind exists in the whole file — one <DJPlayer>, one <SyncedAudio>, one <iframe> — proving there is exactly one authoritative active playback area, not several independent ones on Home", () => {
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });

  it("REGRESSION: starting a new selection (Daily Encouragement, a Home playlist, a library pick, anything) always calls startItem, which replaces the single `current` value — the previous source stops because it was never a second independent player to begin with, just a different value of the one `current`", () => {
    const fn = homeClient.slice(homeClient.indexOf("const startItem = "), homeClient.indexOf("const startItem = ") + 2000);
    expect(fn).toContain("setCurrent(item)");
    expect(fn).toContain("setStarted(true)");
    expect(fn).toContain("setPlaying(true)");
    // Every Home-card Play action funnels through this one function.
    expect(homeClient).toContain("onClick={() => startItem(dailyPick)}");
    expect(homeClient).toMatch(/onClick=\{\(\) => \{ startItem\(heroPlaylist\);/);
  });

  it("REGRESSION: volume/mute preferences survive every category transition regardless of which card started playback — the one persistent player always reads prefs.volume/prefs.muted, and goTab (the only tab-switch path) never touches prefs", () => {
    expect(homeClient).toContain("volume={prefs.volume}");
    expect(homeClient).toContain("muted={prefs.muted}");
    const fn = homeClient.slice(homeClient.indexOf("const goTab = "), homeClient.indexOf("const goTab = ") + 400);
    expect(fn).not.toMatch(/setPrefs\(|updatePrefs\(/);
  });

  it("no data-model workaround was needed for playlists: MediaItem already models them (type \"playlist\", appleEmbed/spotifyEmbed fields) and startItem/spinPool already handled them elsewhere on the page — no new playback union type or duplicated player logic was introduced", () => {
    const lib = readFileSync(join(app, "lib/djCaresLibrary.ts"), "utf8");
    expect(lib).toContain('export type MediaType = "music" | "podcast" | "sermon" | "playlist";');
    // startItem/podcastPanelNode are still the single generic pipeline —
    // no parallel "playlist-only" player component exists.
    expect(homeClient.match(/const startItem = /g)?.length).toBe(1);
    expect(homeClient.match(/const podcastPanelNode = /g)?.length).toBe(1);
  });
});

describe("Visual fix (78c8e55/26a9893 corrected): the full player only leads a tab when it's natural for that tab — never a generic mixer sitting above unrelated content", () => {
  it("REGRESSION: a natural-tab map decides full-vs-mini — Home is natural for everything (it hosts the hero/Daily/Music widgets covering every type); Videos/Sermons/Podcasts/Music are each natural ONLY for their own matching current type", () => {
    expect(homeClient).toContain('? ["spin", "videos"]');
    expect(homeClient).toContain('? ["spin", "sermons"]');
    expect(homeClient).toContain('? ["spin", "podcasts"]');
    expect(homeClient).toContain('? ["spin", "music"]');
    expect(homeClient).toContain("const isNaturalTab = !started || !current || (naturalTabsForCurrent?.includes(tab) ?? true);");
  });

  it('REGRESSION: Videos leads with video content — a music video is natural on tab "videos" (and nowhere else besides Home)', () => {
    const idx = homeClient.indexOf("naturalTabsForCurrent");
    const fn = homeClient.slice(idx, idx + 700);
    expect(fn).toMatch(/isHeroCurrent\s*\n?\s*\?\s*\["spin", "videos"\]/);
  });

  it('REGRESSION: Sermons leads with sermon content — a sermon is natural on tab "sermons" (and nowhere else besides Home)', () => {
    const idx = homeClient.indexOf("naturalTabsForCurrent");
    const fn = homeClient.slice(idx, idx + 700);
    expect(fn).toMatch(/current\.type === "sermon"\s*\n?\s*\?\s*\["spin", "sermons"\]/);
  });

  it('REGRESSION: Podcasts leads with podcast content — a podcast is natural on tab "podcasts" (and nowhere else besides Home) — this is the exact case from the screenshot: an unrelated video no longer shows full-size while browsing Podcasts, it collapses to the mini-player instead', () => {
    const idx = homeClient.indexOf("naturalTabsForCurrent");
    const fn = homeClient.slice(idx, idx + 700);
    expect(fn).toMatch(/current\.type === "podcast"\s*\n?\s*\?\s*\["spin", "podcasts"\]/);
  });

  it('REGRESSION: Music leads with music content — a playlist is natural on tab "music" (and nowhere else besides Home)', () => {
    const idx = homeClient.indexOf("naturalTabsForCurrent");
    const fn = homeClient.slice(idx, idx + 700);
    expect(fn).toMatch(/current\.type === "playlist"\s*\n?\s*\?\s*\["spin", "music"\]/);
  });

  it("REGRESSION: Home's original video-first ordering is restored — the category tabs and the persistent player still lead Home (as locked by the existing section-order test above), and \"spin\" is natural for every media type so the full player (never the mixer-branded header) always shows inline there, right where the hero used to be", () => {
    const nav = at(homeClient, 'aria-label="Category tabs"');
    const playerInsertion = at(homeClient, "{started && activePlayerNode}");
    const hero = at(homeClient, 'id="video-of-the-day"');
    expect(nav).toBeLessThan(playerInsertion);
    expect(playerInsertion).toBeLessThan(hero);
    // "spin" appears in every branch of naturalTabsForCurrent.
    const idx = homeClient.indexOf("naturalTabsForCurrent");
    const fn = homeClient.slice(idx, idx + 700);
    expect(fn.match(/"spin"/g)?.length).toBeGreaterThanOrEqual(5); // 4 typed branches + the bare fallback
  });

  it('the generic "Now Spinning" mixer branding is gone from the persistent player\'s header — replaced by a label naming what\'s actually playing (its origin: Music Video / Daily Encouragement / a plain type label)', () => {
    const start = homeClient.indexOf("const activePlayerNode = (");
    const end = homeClient.indexOf("\n  );", start);
    const section = homeClient.slice(start, end);
    expect(section).not.toContain("Now Spinning");
    expect(section).not.toContain("djc-mini-vinyl");
    expect(homeClient).toContain('const originLabel = isHeroCurrent ? "Music Video" : dailyIsCurrent ? "Daily Encouragement"');
  });
});

describe("Playback collapses to a compact mini-player off the natural tab — never a second full player, never interrupted", () => {
  it('REGRESSION: three visual modes ("full"/"mini"/"overlay") share ONE unchanging JSX shape for the media slot — {videoPanelNode} and {podcastPanelNode} sit together in one wrapper div that is OUTSIDE the mini-vs-full ternary, so switching modes only ever changes style values on the same DJPlayer/SyncedAudio/iframe element, never its position in the tree', () => {
    const start = homeClient.indexOf("const activePlayerNode = (");
    const end = homeClient.indexOf("\n  );", start);
    const section = homeClient.slice(start, end);
    // The media-slot wrapper appears once, and the mode ternary that
    // decides mini-vs-full chrome starts AFTER it — proving the media
    // slot's own ancestor div is never inside that ternary's branches.
    const mediaSlotIdx = section.indexOf("{videoPanelNode}");
    const ternaryIdx = section.indexOf('playerDisplayMode === "mini" ? (');
    expect(mediaSlotIdx).toBeGreaterThan(-1);
    expect(ternaryIdx).toBeGreaterThan(mediaSlotIdx);
    expect(section.match(/\{videoPanelNode\}/g)?.length).toBe(1);
    expect(section.match(/\{podcastPanelNode\}/g)?.length).toBe(1);
  });

  it("REGRESSION: the mini slot only ever changes size/visibility via style values, never display:none, on the exact same elements used at full size — DJPlayer fills whatever box it's given (position:absolute; inset:0 — see DJPlayer.tsx), so shrinking the wrapper never touches its own mount", () => {
    const videoStart = homeClient.indexOf("const videoPanelNode = ");
    const videoEnd = homeClient.indexOf("\n  );", videoStart);
    const videoSrc = homeClient.slice(videoStart, videoEnd);
    expect(videoSrc).not.toMatch(/display:\s*["']none["']/);
    expect(videoSrc).toContain("width: 52, height: 52");

    const podcastStart = homeClient.indexOf("const podcastPanelNode = ");
    const podcastEnd = homeClient.indexOf("\n  );", podcastStart);
    const podcastSrc = homeClient.slice(podcastStart, podcastEnd);
    expect(podcastSrc).not.toMatch(/display:\s*["']none["']/);
    // Native audio is visually hidden in mini mode via a 1px clipped box
    // (opacity/overflow), not display:none or removal — playback is never
    // interrupted by hiding it this way.
    expect(podcastSrc).toMatch(/width:\s*1,\s*height:\s*1/);

    const djPlayer = readFileSync(join(app, "components/DJPlayer.tsx"), "utf8");
    expect(djPlayer).toContain('style={{ position: "absolute", inset: 0 }}');
  });

  it("REGRESSION: expanding the mini-player (Expand button) and collapsing it (Close button) only ever flip `playerExpanded` — they never touch current/started/playing, so the provider is never remounted or restarted by opening/closing the overlay", () => {
    expect(homeClient).toContain("onClick={() => setPlayerExpanded(true)}");
    expect(homeClient).toContain("onClick={() => setPlayerExpanded(false)}");
    // No handler that opens/closes the overlay touches playback state.
    const expandIdx = homeClient.indexOf("onClick={() => setPlayerExpanded(true)}");
    const nearbyExpand = homeClient.slice(Math.max(0, expandIdx - 200), expandIdx + 50);
    expect(nearbyExpand).not.toMatch(/setCurrent\(|setStarted\(|setPlaying\(/);
  });

  it("the mini-player shows a thumbnail/icon, title, real Play/Pause and Mute for controllable media (video/audio), an honest provider label instead of fake controls for embeds, and an Expand button — all with 44px touch targets", () => {
    const start = homeClient.indexOf("const activePlayerNode = (");
    const end = homeClient.indexOf("\n  );", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain('aria-label={(showVideo ? playerState === "playing" : audioPlayingState) ? "Pause" : "Play"}');
    expect(section).toContain('aria-label={prefs.muted ? "Unmute" : "Mute"}');
    expect(section).toContain('aria-label="Expand player"');
    expect(section).toMatch(/via \{current\?\.spotifyEmbed \? "Spotify" : "Apple Music"\}/);
    expect(section.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("the mini-player is fixed to the bottom of the screen, respects the iPhone safe area, and sits below the family header's z-index so it never fights the site-wide nav for stacking", () => {
    const start = homeClient.indexOf("const playerOuterStyle");
    const end = homeClient.indexOf("const playerInnerStyle", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain('position: "fixed", left: 0, right: 0, bottom: 0');
    expect(src).toContain("zIndex: 45");
    const innerStart = homeClient.indexOf("const playerInnerStyle");
    const innerEnd = homeClient.indexOf("const activePlayerNode = (", innerStart);
    expect(homeClient.slice(innerStart, innerEnd)).toContain("env(safe-area-inset-bottom, 0px)");
  });

  it("REGRESSION: only one active media source can ever exist — reconfirmed after the mini-player rework: exactly one <DJPlayer>, one <SyncedAudio>, one <iframe> in the whole file", () => {
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });

  it("REGRESSION: volume and mute still survive every transition, including collapsing to and expanding from the mini-player — the mini-player's own Mute button reuses the exact same toggleMute/prefs the full player uses, not a separate state", () => {
    const start = homeClient.indexOf("const activePlayerNode = (");
    const end = homeClient.indexOf("\n  );", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain("onClick={toggleMute}");
    expect(section).toContain("prefs.muted");
  });

  it("Daily Encouragement and the Music widget selectors still route through startItem, unaffected by the mini-player rework", () => {
    expect(homeClient).toContain("onClick={() => startItem(dailyPick)}");
    expect(homeClient).toMatch(/onClick=\{\(\) => \{ startItem\(heroPlaylist\);/);
  });
});

describe("REGRESSION 12/13 (superseded): every homepage player — video, audio, or embed, wherever it was started from — shares the one site-level volume/mute control, defaulting to a gentle 25%", () => {
  it("the one persistent DJPlayer instance (which now also plays Daily Encouragement's video picks) receives the controlled volume/muted props — no separate initialVolume path anywhere", () => {
    expect(homeClient).toContain("volume={prefs.volume}");
    expect(homeClient).toContain("muted={prefs.muted}");
    expect(homeClient).not.toContain("initialVolume");
  });

  it("DJPlayer no longer has an initialVolume prop at all — every consumer uses the continuously-synced volume/muted props", () => {
    const djPlayer = readFileSync(join(app, "components/DJPlayer.tsx"), "utf8");
    expect(djPlayer).not.toContain("initialVolume");
    expect(djPlayer).toContain("if (cbRef.current.volume !== undefined) playerRef.current?.setVolume(cbRef.current.volume);");
  });

  it("the shared PlayerPrefs default volume is the gentle 25%, not the old 100% blast default", () => {
    const moodQueue = readFileSync(join(app, "lib/moodQueue.ts"), "utf8");
    expect(moodQueue).toContain('export const DEFAULT_PREFS: PlayerPrefs = { volume: 25, muted: false, repeat: "queue" };');
  });
});

describe("shared VolumeControl: a real slider + Mute/Unmute button near playback controls, not just a small icon", () => {
  const volumeControl = readFileSync(join(app, "components/VolumeControl.tsx"), "utf8");

  it("renders a labeled Mute/Unmute button with visible text and an icon, at least a 44px touch target", () => {
    expect(volumeControl).toMatch(/aria-label=\{muted \? "Unmute" : "Mute"\}/);
    expect(volumeControl).toContain("{muted ? \"Unmute\" : \"Mute\"}");
    expect(volumeControl).toMatch(/minWidth:\s*44/);
    expect(volumeControl).toMatch(/minHeight:\s*44/);
  });

  it("renders a labeled range slider (native, so keyboard-operable by default) with a visible percentage", () => {
    expect(volumeControl).toContain('type="range"');
    expect(volumeControl).toContain("min={0}");
    expect(volumeControl).toContain("max={100}");
    expect(volumeControl).toContain('htmlFor={sliderId}');
    expect(volumeControl).toMatch(/id=\{sliderId\}/);
    expect(volumeControl).toContain("aria-valuetext={`${effectiveVolume}%`}");
    expect(volumeControl).toMatch(/\{effectiveVolume\}%/);
  });

  it("moving the slider above zero unmutes, moving it to zero mutes — decided by the pure volumeFromSlider helper, not inline in the component", () => {
    const moodQueue = readFileSync(join(app, "lib/moodQueue.ts"), "utf8");
    expect(moodQueue).toContain("export function volumeFromSlider(value: number)");
    expect(moodQueue).toMatch(/clamped <= 0 \? \{ volume: 0, muted: true \} : \{ volume: clamped, muted: false \}/);
  });

  it("REGRESSION (superseded): HomeClient renders exactly one VolumeControl instance — inside the one persistent player's transportPanel — since Daily Encouragement and the Music widget no longer have anything of their own to control", () => {
    expect(homeClient).toContain('const setVolumeFromSlider = (value: number) => updatePrefs(volumeFromSlider(value));');
    expect(homeClient).toContain('const toggleMute = () => updatePrefs(volumeFromMuteToggle(prefs, lastNonZeroVolumeRef.current));');
    expect(homeClient.match(/volumeControl\(/g)?.length).toBe(1);
    expect(homeClient).toContain('volumeControl("djc-transport-volume")');
  });
});

describe("SyncedAudio: native <audio> initializes at the shared volume and stays in sync", () => {
  const syncedAudio = readFileSync(join(app, "components/SyncedAudio.tsx"), "utf8");

  it("applies volume/100 and mute on mount and whenever prefs change", () => {
    expect(syncedAudio).toContain("el.volume = Math.min(1, Math.max(0, volume / 100));");
    expect(syncedAudio).toContain("el.muted = muted;");
    expect(syncedAudio).toMatch(/\}, \[volume, muted\]\);/);
  });

  it("reports the listener's own native volume/mute adjustments back via onPreferenceChange", () => {
    expect(syncedAudio).toContain('el.addEventListener("volumechange"');
    expect(syncedAudio).toContain("onPreferenceChange({ volume: Math.round(el.volume * 100), muted: el.muted });");
  });

  it("REGRESSION (superseded): the one homepage <audio> playback path — inside podcastPanelNode, now covering Daily Encouragement's audio picks too — uses SyncedAudio with the shared prefs, not a bare <audio>, and autoplays so 'Play here' actually plays immediately", () => {
    expect(homeClient).not.toMatch(/<audio\s/);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    const start = homeClient.indexOf("const podcastPanelNode = ");
    const end = homeClient.indexOf("\n  );", start);
    expect(homeClient.slice(start, end)).toMatch(/<SyncedAudio\s[\s\S]*?\bautoPlay\b/);
  });
});

describe("Spotify/Apple embeds: real controls preserved, no fake site-level control that can't affect playback", () => {
  it("REGRESSION (superseded): the one provider-embed <iframe> in the whole file (inside podcastPanelNode — now covering the Music widget's playlists and Daily Encouragement's embed fallback too) is followed by the same honest note instead of a non-functional slider", () => {
    expect(homeClient).toContain("🔊 Volume is controlled inside this player.");
    // one shared embedVolumeNote node (its definition), referenced at the
    // one embed site — never a fake volume control standing in for it,
    // and never duplicated per card now that Daily Encouragement and the
    // Music widget route through the same persistent embed.
    expect(homeClient.match(/embedVolumeNote/g)?.length).toBe(2);
  });

  it("the Music widget still never claims to control the Apple Music embed's volume directly", () => {
    expect(homeClient).not.toMatch(/heroPlaylist\.(volume|setVolume)/);
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
  it("every menu href is an absolute homepage anchor (works from any route), never a bare #hash", () => {
    const hrefs = [...layout.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      if (href.includes("#")) expect(href.startsWith("/#")).toBe(true);
    }
  });
});

describe("primary ☰ menu doesn't duplicate the on-page category tabs (owner, 2026-08-26)", () => {
  const anchors: Record<string, string> = {
    Home: "/",
    "Digital DJ": "/digital-dj",
    "About TheDJCares": "/about",
  };

  for (const [name, href] of Object.entries(anchors)) {
    it(`"${name}" is in the primary menu, targeting ${href}`, () => {
      const re = new RegExp(`name:\\s*"${name}",\\s*href:\\s*"([^"]+)"`);
      const match = layout.match(re);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(href);
    });
  }

  // Music/Videos/Podcasts/Sermons/Ministries/Churches already live in the
  // on-page category tabs right under the title — repeating them here would
  // put the same destination in two navs at once.
  for (const name of ["Music Videos", "Music", "Sermons", "Podcasts", "Ministries", "Churches", "Now Spinning"]) {
    it(`"${name}" is NOT duplicated in the primary menu`, () => {
      expect(layout).not.toMatch(new RegExp(`name:\\s*"${name}"`));
    });
  }
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
