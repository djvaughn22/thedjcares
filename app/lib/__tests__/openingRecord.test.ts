// ─────────────────────────────────────────────────────────────────────────────
// THE SITE OPENS ON A FRESH MUSIC VIDEO EACH DAY.
//
// For a while the homepage was pinned to "GOOD DAY" every visit, every day.
// That went stale, so the opener is back on the daily rotation: one pick per
// America/Chicago day (the site's existing day boundary, chicagoDateKey), the
// same pick all day, a different one tomorrow.
//
// "GOOD DAY" is not removed or changed — it keeps its own baby video and gets
// its day in the rotation like every other eligible music video.
//
// Explicit /?play=… links and a saved mood mix still win over the day's pick.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { addDaysToDateKey, chicagoDateKey } from "../dailySocialCore";
import { artworkUrl, itemsOfType, LIBRARY, type MediaItem } from "../djCaresLibrary";
import { buildVideoQueueFrom } from "../mainQueue";
import { resolveQueue } from "../moodQueue";
import { findShareMedia } from "../shareLinks";
import { eligibleVideosOfTheDay, selectVideoOfTheDay, VIDEO_OF_THE_DAY_START } from "../videoOfTheDay";

const app = join(__dirname, "..", "..");
const page = readFileSync(join(app, "page.tsx"), "utf8");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");

// What the homepage serves at a given instant — the same composition page.tsx
// uses (selectVideoOfTheDay(chicagoDateKey())), with the clock passed in.
const openerAt = (iso: string) => selectVideoOfTheDay(chicagoDateKey(new Date(iso)));

const song = (id: string): MediaItem => ({
  id,
  type: "music",
  playbackExperience: "watch",
  title: `Song ${id}`,
  author: "Test Artist",
  url: `https://youtube.com/watch?v=${id}`,
  videoId: id,
  vibes: [],
  verified: "2026-01-01",
  musicVideo: true,
});

describe("the homepage opener follows the daily rotation, not a pin", () => {
  it("page.tsx picks the hero record from selectVideoOfTheDay on the Chicago date", () => {
    expect(page).toContain("return selectVideoOfTheDay(chicagoDateKey());");
  });

  it("page.tsx no longer pins any one song as the opener", () => {
    expect(page).not.toContain("song-good-day");
    expect(page).not.toContain("OPENING_RECORD_ID");
  });

  it("a week of openers is not the same record every day", () => {
    const week = Array.from({ length: 7 }, (_, d) => selectVideoOfTheDay(addDaysToDateKey("2026-10-08", d))!.id);
    expect(new Set(week).size).toBe(7);
  });
});

describe("same day, same pick", () => {
  it("is stable from just after midnight to just before midnight, Chicago time", () => {
    // 2026-10-08 in Chicago (CDT, UTC-5): 00:01 → 23:59.
    const morning = openerAt("2026-10-08T05:01:00Z");
    const noon = openerAt("2026-10-08T17:00:00Z");
    const night = openerAt("2026-10-09T04:59:00Z");
    expect(morning!.id).toBe(noon!.id);
    expect(noon!.id).toBe(night!.id);
  });

  it("UTC midnight is not the boundary — the Chicago evening keeps today's pick", () => {
    // 18:30 and 19:30 CDT on Oct 8 sit either side of UTC midnight.
    expect(openerAt("2026-10-08T23:30:00Z")!.id).toBe(openerAt("2026-10-09T00:30:00Z")!.id);
  });

  it("asking again on the same date never re-rolls (no randomness per render)", () => {
    const picks = new Set(Array.from({ length: 20 }, () => selectVideoOfTheDay("2026-10-08")!.id));
    expect(picks.size).toBe(1);
  });
});

describe("adjacent days, different picks", () => {
  it("Chicago midnight turns the record over", () => {
    expect(openerAt("2026-10-09T04:59:00Z")!.id).not.toBe(openerAt("2026-10-09T05:01:00Z")!.id);
  });

  it("no two neighbouring days share an opener across a full year of the real catalog", () => {
    expect(eligibleVideosOfTheDay().length).toBeGreaterThanOrEqual(2);
    for (let d = 0; d < 366; d += 1) {
      const today = addDaysToDateKey(VIDEO_OF_THE_DAY_START, d);
      const tomorrow = addDaysToDateKey(today, 1);
      expect(selectVideoOfTheDay(tomorrow)!.id, `${today} → ${tomorrow}`).not.toBe(selectVideoOfTheDay(today)!.id);
    }
  });

  it("holds at the minimum — two eligible videos alternate day to day", () => {
    const pool = [song("a"), song("b")];
    for (let d = 0; d < 10; d += 1) {
      const today = addDaysToDateKey("2026-10-08", d);
      expect(selectVideoOfTheDay(addDaysToDateKey(today, 1), pool)!.id).not.toBe(selectVideoOfTheDay(today, pool)!.id);
    }
  });

  it("a one-video catalog still opens on that video every day (nothing to alternate with)", () => {
    expect(selectVideoOfTheDay("2026-10-08", [song("only")])!.id).toBe("only");
    expect(selectVideoOfTheDay("2026-10-09", [song("only")])!.id).toBe("only");
  });
});

describe("the day's pick carries its own title, artist, video, and thumbnail", () => {
  it("every opener is the catalog entry itself — never a mix of two entries", () => {
    for (let d = 0; d < 120; d += 1) {
      const pick = selectVideoOfTheDay(addDaysToDateKey("2026-10-08", d))!;
      const entry = LIBRARY.find((i) => i.id === pick.id)!;
      expect(pick).toBe(entry);
      expect(pick.title).toBeTruthy();
      expect(pick.author).toBeTruthy();
      expect(artworkUrl(pick)).toBe(`https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`);
    }
  });

  it("GOOD DAY keeps its baby video and is still in the rotation", () => {
    const goodDay = LIBRARY.find((i) => i.id === "song-good-day")!;
    expect(goodDay.title).toBe("GOOD DAY");
    expect(goodDay.author).toBe("Forrest Frank");
    expect(goodDay.videoId).toBe("eO7-9WzLDZo");
    expect(eligibleVideosOfTheDay()).toContain(goodDay);
  });

  it("on GOOD DAY's day, the opener is GOOD DAY with that same video and thumbnail", () => {
    const size = eligibleVideosOfTheDay().length;
    const day = Array.from({ length: size }, (_, d) => addDaysToDateKey("2026-10-08", d)).find(
      (key) => selectVideoOfTheDay(key)!.id === "song-good-day",
    );
    expect(day, "GOOD DAY never comes up in a full cycle").toBeDefined();
    const pick = selectVideoOfTheDay(day!)!;
    expect(pick.title).toBe("GOOD DAY");
    expect(pick.author).toBe("Forrest Frank");
    expect(pick.videoId).toBe("eO7-9WzLDZo");
    expect(artworkUrl(pick)).toBe("https://i.ytimg.com/vi/eO7-9WzLDZo/hqdefault.jpg");
  });

  it("the hero's title, artist, artwork, and Play all read from that one pick", () => {
    expect(homeClient).toContain("useState<MediaItem | null>(videoOfTheDay)");
    expect(homeClient).toContain("{heroVideo.title}</p>");
    expect(homeClient).toContain("{heroVideo.author}</p>");
    expect(homeClient).toContain("<img src={artworkUrl(heroVideo)!}");
    expect(homeClient).toContain("<button onClick={() => startItem(heroVideo)} style={bigButton}>▶ Play</button>");
  });
});

describe("playlist order: the day's pick first, everything else where it was", () => {
  it("pressing Play on the opener queues it first, then the rest in catalog order", () => {
    const music = itemsOfType("music");
    for (const key of ["2026-10-08", "2026-10-09", "2026-10-10", "2026-12-25"]) {
      const pick = selectVideoOfTheDay(key)!;
      const queue = buildVideoQueueFrom(pick, music);
      const rest = music.filter((i) => i.id !== pick.id && i.videoId).map((i) => i.id);
      expect(queue[0]).toBe(pick);
      expect(queue.slice(1).map((i) => i.id)).toEqual(rest);
    }
  });

  it("the opener appears exactly once in its queue", () => {
    const pick = selectVideoOfTheDay("2026-10-08")!;
    const queue = buildVideoQueueFrom(pick, itemsOfType("music"));
    expect(queue.filter((i) => i.id === pick.id)).toHaveLength(1);
  });

  it("the catalog itself is not re-sorted around the day's pick", () => {
    const music = itemsOfType("music").map((i) => i.id);
    expect(music[0]).toBe("song-way-maker");
  });
});

describe("explicit links and saved mixes still win over the day's pick", () => {
  // The first-cue effect in HomeClient decides what is cued on load.
  const start = homeClient.indexOf('const shared = findShareMedia(params.get("play") ?? "");');
  const end = homeClient.indexOf("}, [videoOfTheDay]);", start);
  const cue = homeClient.slice(start, end);

  it("the first-cue effect is where it was", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it("a playable /?play= link is cued and returns before saved mixes or the day's pick", () => {
    const linkCue = cue.indexOf("setCurrent(shared);");
    const linkReturn = cue.indexOf("return;", linkCue);
    expect(linkCue).toBeGreaterThan(-1);
    expect(linkReturn).toBeLessThan(cue.indexOf("const saved = loadSession();"));
    expect(linkReturn).toBeLessThan(cue.indexOf("setCurrent(videoOfTheDay"));
  });

  it("a saved mood mix is restored and returns before the day's pick", () => {
    const mixCue = cue.indexOf("setCurrent(queue[position]);");
    const mixReturn = cue.indexOf("return;", mixCue);
    expect(mixCue).toBeGreaterThan(-1);
    expect(mixReturn).toBeLessThan(cue.indexOf("setCurrent(videoOfTheDay"));
  });

  it("the day's pick is only the fallback cue — never autoplayed", () => {
    expect(cue.trimEnd().endsWith(
      'setCurrent(videoOfTheDay ?? LIBRARY.find((i) => i.featured && i.type === "music") ?? LIBRARY[0]);',
    )).toBe(true);
    expect(cue).not.toContain("setPlaying(true)");
    expect(cue).not.toContain("startItem(");
  });

  it("/?play=song-good-day still finds GOOD DAY on any day", () => {
    expect(findShareMedia("song-good-day")?.videoId).toBe("eO7-9WzLDZo");
  });

  it("a saved mix resolves to its own songs, untouched by the day's pick", () => {
    const ids = ["song-good-day", "song-way-maker"];
    expect(resolveQueue(ids).map((i) => i.id)).toEqual(ids);
  });
});
