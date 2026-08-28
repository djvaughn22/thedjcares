// Home hero = the visual home of active playback everywhere (owner,
// 2026-08-26): the record-player hero represents whatever is currently
// selected/playing across the whole site — a video from Videos, a playlist
// from Music, a podcast/sermon from Podcasts/Sermons — not just the Video
// of the Day. This supersedes the earlier rule where the hero only ever
// showed music videos and sermons/podcasts/playlists routed the actual
// player to the Daily Encouragement/Music widget's own position instead
// (see homepageOrder.test.ts's playerOrder test for that history).
//
// No jsdom/RTL in this repo (vitest environment: node) — these are the
// same source-text regression tests the rest of the suite uses. Real
// keyboard/DOM behavior for this feature was verified live in the running
// dev server (see the session's final report), not simulated here.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const djPlayer = readFileSync(join(app, "components/DJPlayer.tsx"), "utf8");
const syncedAudio = readFileSync(join(app, "components/SyncedAudio.tsx"), "utf8");
const volumeControl = readFileSync(join(app, "components/VolumeControl.tsx"), "utf8");

describe("Home hero: the record label follows whatever is actually current", () => {
  it("the live hero's record uses artworkUrl(current) — not a hardcoded heroVideo/type-specific pick", () => {
    const start = homeClient.indexOf("heroRecordActive && (");
    const end = homeClient.indexOf("{videoPanelNode}", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain("current && artworkUrl(current)");
    expect(section).toContain("<img src={artworkUrl(current)!} alt=\"\" />");
    // the same branded fallback the idle cue already had, extended to any
    // type with no thumbnail (a podcast/sermon/playlist with no videoId)
    expect(section).toContain('<span className="djc-vinyl-label-fallback" aria-hidden>🎧</span>');
  });

  it("the record's spin state, title-row equalizer, and Play/Pause label all key off `current`/trulyPlaying — no reference to a video-only heroDisplayItem", () => {
    const start = homeClient.indexOf("heroRecordActive && (");
    const end = homeClient.indexOf("{videoPanelNode}", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain('className={`djc-vinyl${trulyPlaying ? " spinning" : ""} engaged`}');
    expect(section).not.toContain("heroDisplayItem");
  });
});

describe("Home hero: idle defaults to the Video of the Day, live represents whatever is current", () => {
  it("idle-only cue (gated on !started) still starts from heroVideo (today's Video of the Day pick) via the shared startItem pipeline — never autoplaying", () => {
    expect(homeClient).toMatch(/tab === "spin" && !started && heroVideo && \(/);
    expect(homeClient).toMatch(/onClick=\{\(\) => startItem\(heroVideo\)\}/);
  });

  it("the moment anything anywhere is started, the live hero (activePlayerNode) takes over at the exact same HOME_ORDER.hero slot — playerOrder is unconditionally HOME_ORDER.hero on Home now, whatever `current` is", () => {
    const start = homeClient.indexOf("const playerOrder =");
    const end = homeClient.indexOf(";", start);
    expect(homeClient.slice(start, end + 1)).toBe('const playerOrder = tab === "spin" ? HOME_ORDER.hero : BROWSE_ORDER.player;');
  });

  it("heroRecordActive — the flag that decides record-vs-real-media visibility — is scoped to Home, to an actual current selection, and to the record view specifically", () => {
    expect(homeClient).toContain('const heroRecordActive = tab === "spin" && Boolean(current) && heroView === "record";');
  });
});

describe("Home hero: the Record/Media two-choice switch covers all four real source types", () => {
  const start = homeClient.indexOf('role="group" aria-label="Hero view"');
  const end = homeClient.indexOf("</div>", homeClient.indexOf("</div>", start) + 1);
  const switchSection = homeClient.slice(Math.max(0, start - 40), end);

  it("Video items expose Record / Video", () => {
    expect(switchSection).toContain('showVideo ? "🎬 Video"');
  });
  it("native audio (a podcast/sermon with a direct audioUrl) exposes Record / Audio", () => {
    expect(switchSection).toContain(': showAudio ? "🎧 Audio"');
  });
  it("a Spotify-embed item exposes Record / Spotify", () => {
    expect(switchSection).toContain('current?.spotifyEmbed ? "🟢 Spotify"');
  });
  it("an Apple-embed item exposes Record / Apple Music (the fallback branch — anything current, controllable or not, that isn't video/audio/Spotify)", () => {
    expect(switchSection).toContain(': "🎵 Apple Music"');
  });

  it("the switch only ever renders for a real current selection with an actual controllable/embeddable source, on Home, not mid-transition on a browsing tab", () => {
    expect(homeClient).toContain('{tab === "spin" && current && (showVideo || showAudio || showEmbed) && (');
  });
});

describe("Home hero: for Apple/Spotify, default to the provider view — the site can't start playback inside a cross-origin embed", () => {
  it("a fresh selection defaults heroView to \"media\" when it's an embed, \"record\" otherwise, and re-decides on every new current item (not just once)", () => {
    const start = homeClient.indexOf("useEffect(() => {\n    if (current) setHeroView(showEmbed ? \"media\" : \"record\");");
    expect(start).toBeGreaterThan(-1);
    const section = homeClient.slice(start, start + 200);
    expect(section).toContain("[current?.id]");
  });

  it("the Record view for an embed offers an explicit, honestly-labeled action to open the real provider — never claims the site can play it directly", () => {
    const start = homeClient.indexOf("heroRecordActive && (");
    const end = homeClient.indexOf("{videoPanelNode}", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain("Open {current?.spotifyEmbed ? \"Spotify\" : \"Apple Music\"} player");
    expect(section).toContain('onClick={() => setHeroView("media")}');
  });
});

describe("Home hero: switching views is presentation-only — never touches playback, never remounts a provider", () => {
  it("neither hero-view toggle button (nor the record's own click handler) ever calls startItem/setCurrent/setStarted/setProgress — only setHeroView, or the same Play/Pause toggle the rest of the page already uses", () => {
    const groupStart = homeClient.indexOf('role="group" aria-label="Hero view"');
    const groupEnd = homeClient.indexOf("</div>", groupStart);
    const group = homeClient.slice(groupStart, groupEnd);
    expect(group).not.toMatch(/startItem\(|setCurrent\(|setStarted\(|setProgress\(/);

    const recordStart = homeClient.indexOf("heroRecordActive && (");
    const recordEnd = homeClient.indexOf("{videoPanelNode}", recordStart);
    const record = homeClient.slice(recordStart, recordEnd);
    expect(record).not.toMatch(/startItem\(|setCurrent\(|setStarted\(|setProgress\(/);
  });

  it("videoPanelNode/podcastPanelNode are hidden via style only (the same never-display:none, 1px+opacity:0 technique already used for the mini-player's audio) when the record is shown — never conditionally excluded from the tree", () => {
    const videoStart = homeClient.indexOf("const videoPanelNode = ");
    const videoEnd = homeClient.indexOf("\n  );", videoStart);
    const videoSrc = homeClient.slice(videoStart, videoEnd);
    expect(videoSrc).toContain("heroRecordActive");
    expect(videoSrc).not.toMatch(/display:\s*["']none["']/);

    const podcastStart = homeClient.indexOf("const podcastPanelNode = ");
    const podcastEnd = homeClient.indexOf("\n  );", podcastStart);
    const podcastSrc = homeClient.slice(podcastStart, podcastEnd);
    expect(podcastSrc).toContain("heroRecordActive");
    expect(podcastSrc).not.toMatch(/display:\s*["']none["']/);
  });

  it("REGRESSION: exactly one DJPlayer, one SyncedAudio, and one provider iframe can ever be mounted — the hero rework adds a view toggle, never a second player", () => {
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });

  it("the record's own click toggles Play/Pause through the exact same setPlaying/toggleAudioPlayback path the transport row uses — not a second, competing control", () => {
    const start = homeClient.indexOf("heroRecordActive && (");
    const end = homeClient.indexOf("{videoPanelNode}", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain("if (showVideo) setPlaying(playerState !== \"playing\");");
    expect(section).toContain("else if (showAudio) toggleAudioPlayback();");
  });
});

describe("Home hero: the record never falsely animates a Spotify/Apple selection", () => {
  it("trulyPlaying is derived only from real signals — YouTube's own playerState, native audio's own play/pause events — and is explicitly false for anything else (an embed)", () => {
    expect(homeClient).toContain(
      "const trulyPlaying = showVideo ? playerState === \"playing\" : showAudio ? audioPlayingState : false;",
    );
  });

  it("the shared origin-row equalizer (leads both the hero and the browse-tab full player) uses trulyPlaying, not the raw playerState that an embed could leave stale from a previous video", () => {
    const idx = homeClient.indexOf('playerDisplayMode !== "mini" && (');
    const section = homeClient.slice(idx, idx + 500);
    expect(section).toContain("{trulyPlaying && (");
    expect(section).not.toContain('{playerState === "playing" && (');
  });
});

describe("Play/Pause now covers native audio in the full transport row (2026-08-26 fix)", () => {
  it("previously only video had a Play/Pause button in transportPanel — a playing podcast/sermon had no way to pause from the full player at all", () => {
    const start = homeClient.indexOf("const transportPanel = (");
    const end = homeClient.indexOf("const originIcon", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain("showVideo && !blocked ? (");
    expect(section).toContain("showAudio ? (");
    expect(section).toContain("onClick={toggleAudioPlayback}");
  });
});

describe("Site-wide volume UX: visible and usable on mobile, not desktop-only", () => {
  it("no viewport-based hiding exists anywhere in HomeClient — no matchMedia/innerWidth gate, no @media rule, wired to volume", () => {
    expect(homeClient).not.toMatch(/matchMedia\([^)]*\)[\s\S]{0,80}[Vv]olume/);
    expect(homeClient).not.toContain("@media");
  });

  it("the shared VolumeControl itself has no desktop-only breakpoint — real 44px range slider + Mute/Unmute button, unconditional", () => {
    expect(volumeControl).not.toContain("@media");
    expect(volumeControl).not.toMatch(/matchMedia/);
    expect(volumeControl).toMatch(/minWidth:\s*44/);
    expect(volumeControl).toMatch(/minHeight:\s*44/);
  });

  it("the mini-player's compact volume button (mobile substitute for inline space) expands the exact same shared VolumeControl — never removes volume, just relocates it below the bar", () => {
    expect(homeClient).toContain('{playerDisplayMode === "mini" && miniVolumeOpen && !showEmbed && (');
    expect(homeClient).toContain('<div style={{ marginTop: 10 }}>{volumeControl("djc-mini-volume")}</div>');
  });

  it("volume/mute/percentage/keyboard/aria-label/aria-valuetext are all present in the one shared component every call site reuses", () => {
    expect(volumeControl).toContain('type="range"');
    expect(volumeControl).toContain("aria-valuetext={`${effectiveVolume}%`}");
    expect(volumeControl).toMatch(/aria-label=\{muted \? "Unmute" : "Mute"\}/);
  });
});

describe("Apple/Spotify embeds: honest device-volume guidance, never a fake slider", () => {
  it("the shared note names both the player's own controls and the device's volume buttons — readable as correct guidance on desktop and mobile without a media query (copy updated 2026-08-27)", () => {
    expect(homeClient).toContain(
      "🔊 Volume: use this player&apos;s controls or your computer/phone volume buttons.",
    );
  });

  it("the note appears next to the real, visible iframe (not the hidden 1px one shown when the hero's Record view is selected) — never a functional-looking slider standing in for it", () => {
    expect(homeClient).toContain("{!isMiniSlot && !heroRecordActive && embedVolumeNote}");
  });

  it("no VolumeControl (the real slider) is ever rendered for an embed — showEmbed is deliberately excluded from every volumeControl() call site's gate", () => {
    const transportIdx = homeClient.indexOf('{(showVideo || showAudio) && (');
    expect(transportIdx).toBeGreaterThan(-1);
    expect(homeClient.slice(transportIdx, transportIdx + 250)).toContain('volumeControl("djc-transport-volume")');
  });
});

describe("REGRESSION: 25% default volume and mute-restoration are untouched by the hero rework", () => {
  it("the shared PlayerPrefs default is still the gentle 25%", () => {
    const moodQueue = readFileSync(join(app, "lib/moodQueue.ts"), "utf8");
    expect(moodQueue).toContain('export const DEFAULT_PREFS: PlayerPrefs = { volume: 25, muted: false, repeat: "queue" };');
  });

  it("toggleMute still restores the last non-zero volume, not a hardcoded value", () => {
    expect(homeClient).toContain("const lastNonZeroVolumeRef = useRef(prefs.volume > 0 ? prefs.volume : DEFAULT_PREFS.volume);");
    expect(homeClient).toContain("const toggleMute = () => updatePrefs(volumeFromMuteToggle(prefs, lastNonZeroVolumeRef.current));");
  });

  it("DJPlayer and SyncedAudio still receive the continuously-synced prefs.volume/prefs.muted — no separate initialVolume path introduced by the hero rework", () => {
    expect(djPlayer).not.toContain("initialVolume");
    expect(syncedAudio).toContain("el.volume = Math.min(1, Math.max(0, volume / 100));");
  });
});

describe("REGRESSION: Home ordering and the shared four-mode switcher are unaffected by the hero rework", () => {
  it("HOME_ORDER's Intro < Hero < Daily < Music < nav (switcher) < rest sequence is untouched", () => {
    const homeOrderIdx = homeClient.indexOf("const HOME_ORDER = {");
    const homeOrderEnd = homeClient.indexOf("} as const;", homeOrderIdx);
    const src = homeClient.slice(homeOrderIdx, homeOrderEnd);
    const readOrderValue = (key: string) => Number(src.match(new RegExp(`\\b${key}:\\s*(\\d+)`))?.[1]);
    expect(readOrderValue("intro")).toBeLessThan(readOrderValue("hero"));
    expect(readOrderValue("hero")).toBeLessThan(readOrderValue("daily"));
    expect(readOrderValue("daily")).toBeLessThan(readOrderValue("music"));
    expect(readOrderValue("music")).toBeLessThan(readOrderValue("nav"));
  });

  it("MediaSwitcher is still the one shared four-mode control, still mounted exactly once", () => {
    expect(homeClient.match(/<MediaSwitcher\b/g)?.length).toBe(1);
  });

  it("Daily Encouragement and the Music widget are still plain selector cards — dailyIsCurrent/musicIsCurrent still exist and still gate their own 'now playing above' language, unaffected by the hero now also representing their picks", () => {
    expect(homeClient).toContain("const dailyIsCurrent = Boolean(started && current && dailyPick && current.id === dailyPick.id);");
    expect(homeClient).toContain("const musicIsCurrent = Boolean(started && current && heroPlaylist && current.id === heroPlaylist.id);");
  });
});
