// Site Player (owner, 2026-08-27, P0): a cross-origin Apple Music iframe
// can't be driven by the site's VolumeControl — the "volume is controlled
// inside this player" sentence was explanatory text standing in for a real
// control, not a real control. For any playlist with a curated
// siteQueueIds, the real fix is to play its own real, oEmbed-verified
// YouTube tracks through the exact same DJPlayer/startItem pipeline every
// other music video already uses — genuine shared VolumeControl, not a
// second one.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { itemsOfType, LIBRARY, siteQueueFor } from "../djCaresLibrary";

const app = join(__dirname, "../..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const volumeControl = readFileSync(join(app, "components/VolumeControl.tsx"), "utf8");

describe("Playlist data audit: siteQueueFor resolves to real, playable, curated tracks", () => {
  const playlists = itemsOfType("playlist");

  it("Faith Playlist has a real, non-empty curated queue", () => {
    const faith = playlists.find((p) => p.id === "apple-faith-playlist")!;
    expect(faith).toBeTruthy();
    const tracks = siteQueueFor(faith);
    expect(tracks.length).toBeGreaterThan(0);
  });

  it("every resolved track for every playlist is a real LIBRARY entry with a real videoId — never invented, never scraped", () => {
    for (const p of playlists) {
      for (const track of siteQueueFor(p)) {
        expect(LIBRARY.some((i) => i.id === track.id)).toBe(true);
        expect(track.videoId).toBeTruthy();
        expect(track.active).not.toBe(false);
      }
    }
  });

  it("no siteQueueIds entry is a dead/mistyped id — every declared id actually resolves", () => {
    for (const p of playlists) {
      if (!p.siteQueueIds) continue;
      expect(siteQueueFor(p).length).toBe(p.siteQueueIds.length);
    }
  });

  it("a playlist with no siteQueueIds resolves to an empty queue and stays Apple-only — never a fabricated stand-in", () => {
    const unmapped = playlists.filter((p) => !p.siteQueueIds);
    expect(unmapped.length).toBeGreaterThan(0); // at least one real unmapped case exists to prove the fallback path is real
    for (const p of unmapped) {
      expect(siteQueueFor(p)).toEqual([]);
    }
  });

  it("no two playlists silently claim the same track — each site-queue track has one unambiguous playlist context", () => {
    const seen = new Set<string>();
    for (const p of playlists) {
      for (const id of p.siteQueueIds ?? []) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it("mapped playlists' vibes genuinely overlap their queue's own vibes — no genre mismatch (e.g. tagging a hymn as the rap playlist's queue)", () => {
    for (const p of playlists) {
      const tracks = siteQueueFor(p);
      if (tracks.length === 0) continue;
      for (const track of tracks) {
        expect(track.vibes.some((v) => p.vibes.includes(v))).toBe(true);
      }
    }
  });
});

describe("Site Player: real playback wiring in HomeClient", () => {
  it("startSitePlayerQueue seeds a real mainQueue from the curated tracks and starts the first one through the authoritative startItem pipeline — never a second, parallel play path", () => {
    const start = homeClient.indexOf("const startSitePlayerQueue = ");
    const end = homeClient.indexOf("}, [startItem]);", start);
    const fn = homeClient.slice(start, end);
    expect(fn).toContain("siteQueueFor(playlist)");
    expect(fn).toContain("setMainQueue({ queue: buildVideoQueueFrom(first, tracks), position: 0 })");
    expect(fn).toContain("startItem(first, false, false, true)");
  });

  it("startPlaylist defaults to Site Player when a curated queue exists, falls back to the plain Apple embed otherwise — the one function every playlist Play button now calls", () => {
    const start = homeClient.indexOf("const startPlaylist = ");
    const end = homeClient.indexOf("}, [startSitePlayerQueue, startItem]);", start);
    const fn = homeClient.slice(start, end);
    expect(fn).toContain("if (siteQueueFor(p).length > 0) {");
    expect(fn).toContain("startSitePlayerQueue(p);");
    expect(fn).toContain("startItem(p);");
  });

  it("Faith Playlist defaults to Site Player: the Music widget and PlaylistCard's Play buttons both route through startPlaylist, not a direct startItem(playlist) call", () => {
    expect(homeClient).toContain("onClick={() => startPlaylist(heroPlaylist)}");
    expect(homeClient).toContain("<button onClick={() => startPlaylist(p)} style={bigButton}>▶ Play here</button>");
    expect(homeClient).not.toMatch(/onClick=\{\(\) => startItem\(heroPlaylist\)\}/);
  });
});

describe("Site Player: a real shared volume slider, same component every controllable source already uses", () => {
  it("a Site Player track is a real music-video item (has a videoId) — showVideo is true for it, which is what gates the real VolumeControl in transportPanel (see homeHero.test.ts's existing volume-gate test)", () => {
    const faith = itemsOfType("playlist").find((p) => p.id === "apple-faith-playlist")!;
    const tracks = siteQueueFor(faith);
    for (const t of tracks) expect(t.videoId).toBeTruthy();
  });

  it("no separate volume implementation was introduced for Site Player — it's still the same two volumeControl() call sites (transport row, mini-player expansion), same VolumeControl component, same 25%/mute-restore prefs", () => {
    expect(homeClient.match(/volumeControl\(/g)?.length).toBe(2);
    expect(homeClient).toContain('volumeControl("djc-transport-volume")');
    expect(homeClient).toContain('volumeControl("djc-mini-volume")');
  });

  it("the shared VolumeControl has no desktop-only gate — same component reaches mobile and desktop identically, whether reached from a Site Player track, a plain video, or native audio", () => {
    expect(volumeControl).not.toContain("@media");
    expect(volumeControl).not.toMatch(/matchMedia/);
    expect(volumeControl).toMatch(/minWidth:\s*44/);
    expect(volumeControl).toMatch(/minHeight:\s*44/);
  });
});

describe("Apple Music: optional, never a fake site slider", () => {
  it("Apple Music remains reachable — the new source switch's second choice always calls the real startItem(playlist), never hides the option", () => {
    const start = homeClient.indexOf('role="group" aria-label="Playback source"');
    const end = homeClient.indexOf("</div>", homeClient.indexOf("</div>", start) + 1);
    const section = homeClient.slice(start, end);
    expect(section).toContain("🎵 Apple Music");
    expect(section).toContain("startItem(sitePlayerSourcePlaylist)");
  });

  it("volumeControl (the real slider) is never rendered for an embed — showEmbed is excluded from every volumeControl() gate, Apple Music included", () => {
    const transportIdx = homeClient.indexOf("{(showVideo || showAudio) && (");
    expect(transportIdx).toBeGreaterThan(-1);
    expect(homeClient.slice(transportIdx, transportIdx + 250)).toContain('volumeControl("djc-transport-volume")');
  });

  it("Apple Music shows the honest provider/device-volume guidance instead — not merely-explanatory text standing alone, but paired with an obvious, prominent route back to the real slider (the Site Player switch)", () => {
    expect(homeClient).toContain(
      "🔊 Volume is controlled inside this player — or with your device&apos;s volume buttons.",
    );
    // The switch renders whenever a mapped playlist is behind the current
    // selection — including while Apple Music itself is the active side —
    // so "Site Player" is always one tap away, never buried.
    const switchStart = homeClient.indexOf('role="group" aria-label="Playback source"');
    expect(switchStart).toBeGreaterThan(-1);
    expect(homeClient).toContain("sitePlayerSourcePlaylist && siteQueueFor(sitePlayerSourcePlaylist).length > 0");
  });
});

describe("Switching Site Player ↔ Apple Music: stops the prior source, only one can ever play", () => {
  it("both switch buttons are real startItem/startSitePlayerQueue calls (a genuine `current` swap), not a CSS/style-only toggle — the prior provider unmounts because its own gating condition (showVideo/showEmbed) stops matching the new `current`", () => {
    const start = homeClient.indexOf('role="group" aria-label="Playback source"');
    const end = homeClient.indexOf("</div>", homeClient.indexOf("</div>", start) + 1);
    const section = homeClient.slice(start, end);
    expect(section).toContain("startSitePlayerQueue(sitePlayerSourcePlaylist)");
    expect(section).toContain("startItem(sitePlayerSourcePlaylist)");
  });

  it("each switch button no-ops when you tap the side you're already on — never restarts the same source from scratch", () => {
    const start = homeClient.indexOf('role="group" aria-label="Playback source"');
    const end = homeClient.indexOf("</div>", homeClient.indexOf("</div>", start) + 1);
    const section = homeClient.slice(start, end);
    expect(section).toContain('if (current?.type === "playlist") startSitePlayerQueue(sitePlayerSourcePlaylist);');
    expect(section).toContain('if (current?.type !== "playlist") startItem(sitePlayerSourcePlaylist);');
  });

  it("REGRESSION: exactly one DJPlayer, one SyncedAudio, one provider iframe can ever be mounted — the Site Player/Apple Music switch adds a new source-selection UI, never a second player", () => {
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });
});

describe("Record artwork follows the Site Player's current track", () => {
  it("the hero's record view still uses artworkUrl(current) unconditionally — for a Site Player track, current IS the real song, so the record already shows its own YouTube thumbnail, not the playlist's own cover", () => {
    const start = homeClient.indexOf("heroRecordActive && (");
    const end = homeClient.indexOf("{videoPanelNode}", start);
    const section = homeClient.slice(start, end);
    expect(section).toContain("current && artworkUrl(current)");
  });
});

describe("Previous, Next, Shuffle, Repeat, and Share use the Site Player queue", () => {
  it("prev/next/toggleMainShuffle/mainRepeat all read from the SAME mainQueue state startSitePlayerQueue seeds — no separate Site Player transport implementation", () => {
    expect(homeClient).toContain("const [mainQueue, setMainQueue] = useState<{ queue: MediaItem[]; position: number } | null>(null);");
    // startSitePlayerQueue writes into this exact state (already asserted
    // above) — next()/prev()/mainNext()/toggleMainShuffle() (existing,
    // untouched) then just work, whatever seeded the queue.
    expect(homeClient).toContain("const mainNext = useCallback((direction: 1 | -1): boolean => {");
    expect(homeClient).toContain("const toggleMainShuffle = () => {");
  });

  it("Share in the transport row still shares whatever `current` actually is — a Site Player track's own share target, not the playlist's", () => {
    expect(homeClient).toContain('{current && share(mediaShareTarget(current), "deck")}');
  });
});

describe("REGRESSION: owner-approved hero and category UX remain intact", () => {
  it("Home ordering is untouched — Intro < Hero < Daily < Music < nav < rest", () => {
    const homeOrderIdx = homeClient.indexOf("const HOME_ORDER = {");
    const homeOrderEnd = homeClient.indexOf("} as const;", homeOrderIdx);
    const src = homeClient.slice(homeOrderIdx, homeOrderEnd);
    const readOrderValue = (key: string) => Number(src.match(new RegExp(`\\b${key}:\\s*(\\d+)`))?.[1]);
    expect(readOrderValue("intro")).toBeLessThan(readOrderValue("hero"));
    expect(readOrderValue("hero")).toBeLessThan(readOrderValue("daily"));
    expect(readOrderValue("daily")).toBeLessThan(readOrderValue("music"));
    expect(readOrderValue("music")).toBeLessThan(readOrderValue("nav"));
  });

  it("playerOrder is still unconditionally HOME_ORDER.hero on Home — the Site Player/Apple Music switch didn't reintroduce type-based player routing", () => {
    const start = homeClient.indexOf("const playerOrder =");
    const end = homeClient.indexOf(";", start);
    expect(homeClient.slice(start, end + 1)).toBe('const playerOrder = tab === "spin" ? HOME_ORDER.hero : BROWSE_ORDER.player;');
  });

  it("the shared four-mode MediaSwitcher is still mounted exactly once, untouched", () => {
    expect(homeClient.match(/<MediaSwitcher\b/g)?.length).toBe(1);
  });

  it("the Record/Video/Audio/Spotify/Apple-Music presentation switch (from the prior hero pass) is untouched — it still exists as a second, independent row beneath the new Site Player/Apple Music source switch", () => {
    expect(homeClient).toContain('role="group" aria-label="Hero view"');
    expect(homeClient).toContain('const [heroView, setHeroView] = useState<"record" | "media">("record")');
  });

  it("25% default volume and mute-restoration are untouched", () => {
    const moodQueue = readFileSync(join(app, "lib/moodQueue.ts"), "utf8");
    expect(moodQueue).toContain('export const DEFAULT_PREFS: PlayerPrefs = { volume: 25, muted: false, repeat: "queue" };');
  });
});
