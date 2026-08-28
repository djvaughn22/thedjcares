// Owner correction (2026-08-27): commit 22c29e4 ("Site Player") overstepped
// a volume-controls request into a new playback product — a second
// YouTube-backed queue, siteQueueIds playlist mappings, and a Site Player/
// Apple Music source switch. Reverted via commit f397f1e, restoring the
// accepted 59e676a hero experience exactly. This file guards two things:
// (1) none of the reverted Site Player surface ever quietly comes back,
// and (2) the one legitimate volume-visibility correction that followed
// the revert — clearer Apple/Spotify guidance copy — is in place, without
// re-introducing anything the revert removed.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { itemsOfType, LIBRARY } from "../djCaresLibrary";

const app = join(__dirname, "../..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const volumeControl = readFileSync(join(app, "components/VolumeControl.tsx"), "utf8");

describe("REGRESSION (2026-08-27): all Site Player code and mappings are gone", () => {
  it("no siteQueueIds field exists on any library item — playlist content is exactly what it was before 22c29e4", () => {
    for (const item of LIBRARY) {
      expect((item as { siteQueueIds?: unknown }).siteQueueIds).toBeUndefined();
    }
  });

  it("no siteQueueFor export, no Site Player functions, no Site Player UI strings remain in HomeClient", () => {
    for (const banned of [
      "siteQueueFor",
      "siteQueueIds",
      "startSitePlayerQueue",
      "startPlaylist",
      "sitePlayerSourcePlaylist",
      "🎧 Site Player",
      'aria-label="Playback source"',
    ]) {
      expect(homeClient).not.toContain(banned);
    }
  });

  it("the sitePlayer test file from 22c29e4 is gone", () => {
    expect(existsSync(join(app, "lib/__tests__/sitePlayer.test.ts"))).toBe(false);
  });

  it("djCaresLibrary.ts has no siteQueueFor helper and no FAITH_PLAYLIST_SITE_QUEUE/CHURCH_HYMNS_SITE_QUEUE curation", () => {
    const lib = readFileSync(join(app, "lib/djCaresLibrary.ts"), "utf8");
    for (const banned of ["siteQueueFor", "siteQueueIds", "FAITH_PLAYLIST_SITE_QUEUE", "CHURCH_HYMNS_SITE_QUEUE"]) {
      expect(lib).not.toContain(banned);
    }
  });

  it("every playlist's Play action is a direct startItem/startPlaylist-free call again — the Music widget and PlaylistCard route straight to the Apple embed, exactly as before 22c29e4", () => {
    expect(homeClient).toMatch(/onClick=\{\(\) => \{ startItem\(heroPlaylist\); track\("playlist_open"/);
    const start = homeClient.indexOf("const PlaylistCard = ");
    const end = homeClient.indexOf("\n  };", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain("onClick={() => startItem(p)}");
    expect(src).not.toContain("startPlaylist(p)");
  });
});

describe("REGRESSION (2026-08-27): the accepted 59e676a hero behavior is restored exactly", () => {
  it("playerOrder is unconditionally HOME_ORDER.hero on Home — unchanged by the revert (this was 59e676a behavior, not part of what got reverted)", () => {
    const start = homeClient.indexOf("const playerOrder =");
    const end = homeClient.indexOf(";", start);
    expect(homeClient.slice(start, end + 1)).toBe('const playerOrder = tab === "spin" ? HOME_ORDER.hero : BROWSE_ORDER.player;');
  });

  it("the Record/Video/Audio/Spotify/Apple-Music presentation switch (heroView) is intact, and is the ONLY hero switch — no second 'Playback source' switch exists alongside it", () => {
    expect(homeClient).toContain('role="group" aria-label="Hero view"');
    expect(homeClient).toContain('const [heroView, setHeroView] = useState<"record" | "media">("record")');
    expect(homeClient.match(/role="group"/g)?.length).toBe(1);
  });

  it("Faith Playlist and every other playlist still Play straight to their real Apple embed — content and behavior match what the owner approved at 59e676a", () => {
    const playlists = itemsOfType("playlist");
    expect(playlists.length).toBeGreaterThan(0);
    for (const p of playlists) {
      expect(p.appleEmbed).toBeTruthy();
    }
  });

  it("Home hierarchy (Intro < Hero < Daily < Music < nav < rest) is untouched", () => {
    const homeOrderIdx = homeClient.indexOf("const HOME_ORDER = {");
    const homeOrderEnd = homeClient.indexOf("} as const;", homeOrderIdx);
    const src = homeClient.slice(homeOrderIdx, homeOrderEnd);
    const readOrderValue = (key: string) => Number(src.match(new RegExp(`\\b${key}:\\s*(\\d+)`))?.[1]);
    expect(readOrderValue("intro")).toBeLessThan(readOrderValue("hero"));
    expect(readOrderValue("hero")).toBeLessThan(readOrderValue("daily"));
    expect(readOrderValue("daily")).toBeLessThan(readOrderValue("music"));
    expect(readOrderValue("music")).toBeLessThan(readOrderValue("nav"));
  });

  it("the shared four-mode MediaSwitcher is still mounted exactly once, untouched", () => {
    expect(homeClient.match(/<MediaSwitcher\b/g)?.length).toBe(1);
  });
});

describe("Volume-only correction: every controllable player view exposes the real shared VolumeControl", () => {
  it("the transport row's volume gate covers exactly the genuinely controllable sources (YouTube via DJPlayer, native audio via SyncedAudio) — never an embed", () => {
    const transportIdx = homeClient.indexOf("{(showVideo || showAudio) && (");
    expect(transportIdx).toBeGreaterThan(-1);
    expect(homeClient.slice(transportIdx, transportIdx + 200)).toContain('volumeControl("djc-transport-volume")');
  });

  it("mobile does not hide the volume control — the mini-player's compact button expands the exact same shared VolumeControl into its own row, never removing it on narrow screens", () => {
    expect(homeClient).toContain('{playerDisplayMode === "mini" && miniVolumeOpen && !showEmbed && (');
    expect(homeClient).toContain('<div style={{ marginTop: 10 }}>{volumeControl("djc-mini-volume")}</div>');
  });

  it("no desktop-only media query gates volume anywhere in HomeClient or VolumeControl itself", () => {
    expect(homeClient).not.toContain("@media");
    expect(homeClient).not.toMatch(/matchMedia\([^)]*\)[\s\S]{0,80}[Vv]olume/);
    expect(volumeControl).not.toContain("@media");
    expect(volumeControl).not.toMatch(/matchMedia/);
  });

  it("VolumeControl itself: real slider, visible percentage, Mute/Unmute, 44px targets, keyboard-native range input", () => {
    expect(volumeControl).toContain('type="range"');
    expect(volumeControl).toContain("aria-valuetext={`${effectiveVolume}%`}");
    expect(volumeControl).toMatch(/aria-label=\{muted \? "Unmute" : "Mute"\}/);
    expect(volumeControl).toMatch(/minWidth:\s*44/);
    expect(volumeControl).toMatch(/minHeight:\s*44/);
  });

  it("the same shared prefs/25% default/mute-restoration drive every volumeControl() call site — exactly two, both routed through the one helper", () => {
    expect(homeClient.match(/volumeControl\(/g)?.length).toBe(2);
    const moodQueue = readFileSync(join(app, "lib/moodQueue.ts"), "utf8");
    expect(moodQueue).toContain('export const DEFAULT_PREFS: PlayerPrefs = { volume: 25, muted: false, repeat: "queue" };');
  });

  it("volume preference survives category navigation — goTab (the only tab-switch path) never touches prefs, so the same prefs.volume/muted keep driving whichever provider is current", () => {
    const fn = homeClient.slice(homeClient.indexOf("const goTab = "), homeClient.indexOf("const goTab = ") + 400);
    expect(fn).not.toMatch(/setPrefs\(|updatePrefs\(/);
    expect(homeClient).toContain("volume={prefs.volume}");
    expect(homeClient).toContain("muted={prefs.muted}");
  });
});

describe("Apple/Spotify: original embeds unchanged, honest guidance, no fake slider, no MusicKit", () => {
  it("Apple and Spotify still play through the same podcastPanelNode iframe — never replaced by YouTube", () => {
    const start = homeClient.indexOf("const podcastPanelNode = ");
    const end = homeClient.indexOf("\n  );", start);
    const src = homeClient.slice(start, end);
    expect(src).toContain("getEmbedUrl(current!)!");
    expect(src).toContain("<iframe");
  });

  it("the guidance copy clearly names the player's own controls and the device volume buttons — not merely a vague sentence, this exact wording", () => {
    expect(homeClient).toContain(
      "🔊 Volume: use this player&apos;s controls or your computer/phone volume buttons.",
    );
  });

  it("no fake/disabled slider is ever rendered for a cross-origin embed — both volumeControl() call sites are gated to exclude it", () => {
    // Transport row: gated on (showVideo || showAudio) only — an embed
    // (showEmbed) never satisfies that. Mini expansion: explicitly
    // excludes showEmbed. Neither can ever fire while an embed is current.
    const transportIdx = homeClient.indexOf("{(showVideo || showAudio) && (");
    expect(homeClient.slice(transportIdx, transportIdx + 200)).not.toContain("showEmbed");
    expect(homeClient).toContain('{playerDisplayMode === "mini" && miniVolumeOpen && !showEmbed && (');
  });

  it("no MusicKit, Apple developer token, or Apple credential system exists in HomeClient or the library — never add one without explicit authorization", () => {
    expect(homeClient).not.toMatch(/musickit|MusicKit|MUSICKIT/);
    const lib = readFileSync(join(app, "lib/djCaresLibrary.ts"), "utf8");
    expect(lib).not.toMatch(/musickit|MusicKit|MUSICKIT/);
  });
});

describe("REGRESSION: only one authoritative playback source exists", () => {
  it("exactly one DJPlayer, one SyncedAudio, one provider iframe possible — the volume-only correction added no new mount point", () => {
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });

  it("exactly one mainQueue state, seeded only by startItem's own catalog-wide logic — no scoped/curated queue variant remains", () => {
    expect(homeClient.match(/const \[mainQueue, setMainQueue\]/g)?.length).toBe(1);
    expect(homeClient).toContain("buildVideoQueueFrom(item, itemsOfType(\"music\"))");
  });
});
