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
  it("Music Video Deck leads, Daily Encouragement directly beneath it, THE MUSIC deck beneath that, then the shared deck (for anything else), then Videos/Sermons/Podcasts previews, Digital DJ last — exactly three curated decks up top, browse content after", () => {
    // `deck` (id="now-playing") is a const defined well above the return
    // statement and referenced by name where it actually renders — so its
    // render POSITION is where it's actually inserted into the tree, not
    // its definition's id=.
    const hero = at(homeClient, 'id="video-of-the-day"');
    const daily = at(homeClient, 'id="daily-encouragement"');
    const music = at(homeClient, 'id="music"');
    const deckInsertion = at(homeClient, "{started && !isHeroCurrent && deck}");
    const videos = at(homeClient, 'id="videos"');
    const sermons = at(homeClient, 'id="sermons"');
    const podcasts = at(homeClient, 'id="podcasts"');
    const digitalDj = at(homeClient, 'aria-label="Digital DJ"');

    for (const idx of [hero, daily, music, deckInsertion, videos, sermons, podcasts, digitalDj]) {
      expect(idx).toBeGreaterThan(-1);
    }
    // Owner-locked hierarchy: Video Deck, Daily Encouragement, Music Deck
    // — exactly three decks, nothing wedged between them — then whatever
    // else is playing (a sermon/podcast picked from browse content), then
    // browse/discovery.
    expect(hero).toBeLessThan(daily);
    expect(daily).toBeLessThan(music);
    expect(music).toBeLessThan(deckInsertion);
    expect(deckInsertion).toBeLessThan(videos);
    expect(videos).toBeLessThan(sermons);
    expect(sermons).toBeLessThan(podcasts);
    expect(podcasts).toBeLessThan(digitalDj);
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

  it("REGRESSION: isHeroCurrent covers ANY currently-playing music video (not just the exact cued heroVideo pick) — a Music Videos preview card, a mood mix, or a vibe spin all merge into the SAME video deck instead of opening a second Now Spinning video player", () => {
    expect(homeClient).toContain(
      "const isHeroCurrent = Boolean(current && current.type === \"music\" && current.videoId);",
    );
    expect(homeClient).toContain("const heroDisplayItem = isHeroCurrent && current ? current : heroVideo;");
    expect(homeClient).not.toContain("isDailyCurrent"); // removed entirely — no longer meaningful
    expect(homeClient).toContain("const [dailyPick, setDailyPick] = useState<MediaItem | null>(initialDailyPick)");
  });

  it("REGRESSION: the shared deck (Prev/Next/Shuffle/Repeat/Spin Something Else/blocked-recovery/queue-status) is a single transportPanel node placed in the hero when a video is current, or the deck otherwise — never rendered twice", () => {
    expect(homeClient).toContain("const transportPanel = (");
    expect(homeClient).toContain("{isHeroStarted && transportPanel}");
    expect(homeClient).toContain("{!isHeroCurrent && transportPanel}");
  });

  it("prefers a direct verified audioUrl (native <audio controls>, wrapped in SyncedAudio for shared-volume sync) over a provider embed, for whichever item is playing in the shared deck (e.g. a podcast played from the Podcasts tab)", () => {
    expect(homeClient).toContain("const showAudio = Boolean(started && current && !current.videoId && current.audioUrl);");
    expect(homeClient).toMatch(/<SyncedAudio\s+controls/);
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

  it("REGRESSION 10 (superseded): Daily Encouragement's video player now gets the same shared site-level volume/mute prefs as every other player, not a one-off initialVolume", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(section).not.toContain("initialVolume");
    expect(section).toContain("volume={prefs.volume}");
    expect(section).toContain("muted={prefs.muted}");
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

describe("Music Deck: THE MUSIC, compact ⇄ expanded, own local player", () => {
  it("REGRESSION 7: the Music deck never touches current/started/the video or Daily Encouragement pools — it's local state built on the existing Apple Music playlist data", () => {
    expect(homeClient).toContain("const [musicExpanded, setMusicExpanded] = useState(false)");
    expect(homeClient).toContain("const [musicPlaying, setMusicPlaying] = useState(false)");
    const section = homeClient.slice(homeClient.indexOf('id="music" aria-label="The Music"'), homeClient.indexOf('id="videos" aria-label="Music Videos preview"'));
    expect(section).not.toMatch(/startItem\(/);
    expect(section).not.toContain("setCurrent(");
  });

  it("compact cover-artwork preview exists before the real Apple Music embed mounts", () => {
    const section = homeClient.slice(homeClient.indexOf('id="music" aria-label="The Music"'), homeClient.indexOf('id="videos" aria-label="Music Videos preview"'));
    expect(section).toContain("musicExpanded ? (");
    expect(section).toContain('aspectRatio: "1"'); // square cover-art preview, not a 16:9 video box
    expect(section.match(/<iframe/g)?.length).toBe(1); // only mounted once expanded
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

describe("cross-deck exclusivity: only one of Video/Daily/Music plays at once", () => {
  it("REGRESSION 1: a single activeDeck value coordinates all three decks — smallest possible architecture, not a new app-wide media framework", () => {
    expect(homeClient).toContain(
      'const [activeDeck, setActiveDeck] = useState<"video" | "daily" | "music" | null>(null);',
    );
  });

  it("REGRESSION 2: starting Daily Encouragement (or Music) pauses/collapses the video deck", () => {
    const fn = homeClient.slice(homeClient.indexOf('if (activeDeck !== "video"'), homeClient.indexOf('if (activeDeck !== "video"') + 200);
    expect(fn).toContain("setPlaying(false)");
    expect(fn).toContain('setHeroView("record")');
  });

  it("REGRESSION 3: starting the video deck (or Music) pauses/collapses Daily Encouragement", () => {
    const fn = homeClient.slice(homeClient.indexOf('if (activeDeck !== "daily"'), homeClient.indexOf('if (activeDeck !== "daily"') + 200);
    expect(fn).toContain("setDailyPlaying(false)");
    expect(fn).toContain("setDailyExpanded(false)");
  });

  it("starting the video deck (or Daily Encouragement) pauses/collapses the Music deck", () => {
    const fn = homeClient.slice(homeClient.indexOf('if (activeDeck !== "music"'), homeClient.indexOf('if (activeDeck !== "music"') + 200);
    expect(fn).toContain("setMusicPlaying(false)");
    expect(fn).toContain("setMusicExpanded(false)");
  });

  it("each deck claims activeDeck the moment it actually starts playing (not merely when cued/idle)", () => {
    expect(homeClient).toMatch(/if \(isHeroStarted && playing\) setActiveDeck\("video"\);/);
    expect(homeClient).toMatch(/if \(dailyPlaying\) setActiveDeck\("daily"\);/);
    expect(homeClient).toMatch(/if \(musicPlaying\) setActiveDeck\("music"\);/);
  });
});

describe("REGRESSION 12/13 (superseded): every homepage YouTube player shares one site-level volume/mute control, defaulting to a gentle 25%", () => {
  it("Daily Encouragement's DJPlayer receives the same controlled volume/muted props as the hero/deck DJPlayer — no separate initialVolume path", () => {
    const section = homeClient.slice(homeClient.indexOf('id="daily-encouragement"'), homeClient.indexOf("Original source ↗"));
    expect(section).toContain("volume={prefs.volume}");
    expect(section).toContain("muted={prefs.muted}");
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

  it("HomeClient wires the same volumeControl/toggleMute helpers into the shared transportPanel and Daily Encouragement", () => {
    expect(homeClient).toContain('const setVolumeFromSlider = (value: number) => updatePrefs(volumeFromSlider(value));');
    expect(homeClient).toContain('const toggleMute = () => updatePrefs(volumeFromMuteToggle(prefs, lastNonZeroVolumeRef.current));');
    expect(homeClient).toContain('volumeControl("djc-transport-volume")');
    expect(homeClient).toContain('volumeControl("djc-daily-volume")');
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

  it("both homepage <audio> playback paths (the shared deck's podcast panel and Daily Encouragement's) use SyncedAudio with the shared prefs, not a bare <audio>", () => {
    expect(homeClient).not.toMatch(/<audio\s/);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(2);
  });
});

describe("Spotify/Apple embeds: real controls preserved, no fake site-level control that can't affect playback", () => {
  it("every provider-embed iframe (shared deck podcast fallback, Daily Encouragement fallback, and the Music deck's Apple Music embed) is followed by the same honest note instead of a non-functional slider", () => {
    expect(homeClient).toContain("🔊 Volume is controlled inside this player.");
    // one shared embedVolumeNote node (its definition), referenced at all
    // three embed sites — never a fake volume control standing in for it.
    expect(homeClient.match(/embedVolumeNote/g)?.length).toBe(4);
  });

  it("the Music deck still never claims to control the Apple Music embed's volume directly", () => {
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
