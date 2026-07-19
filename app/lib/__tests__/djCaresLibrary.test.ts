import { describe, expect, it } from "vitest";
import {
  APPROVED_CHURCHES,
  artworkUrl,
  getEmbedUrl,
  getWatchUrl,
  LIBRARY,
  MINISTRIES,
  ministryByKey,
  VIBES,
} from "../djCaresLibrary";

// Only these hosts may ever appear as a canonical source. Anything else in
// the library is a curation mistake — the shuffle can never leave this list.
const APPROVED_HOSTS = new Set([
  "www.youtube.com",
  "music.apple.com",
  "open.spotify.com",
  "www.oneplace.com",
  "www.intouch.org",
  "www.ttb.org",
  "www.davidjeremiah.org",
  "www.drjamesdobson.org",
  "billygraham.org",
  "www.lwf.org",
  "allenjackson.com",
  "pastorrick.com",
  "www.odbm.org",
]);

describe("library integrity", () => {
  it("ids are unique", () => {
    const ids = LIBRARY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item has title, author, vibes, url, and a verification date", () => {
    for (const item of LIBRARY) {
      expect(item.title).toBeTruthy();
      expect(item.author).toBeTruthy();
      expect(item.vibes.length).toBeGreaterThan(0);
      expect(item.url).toMatch(/^https:\/\//);
      expect(item.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every source URL points at an approved official host", () => {
    for (const item of LIBRARY) {
      const host = new URL(item.url).host;
      expect(APPROVED_HOSTS.has(host), `${item.id} → ${host}`).toBe(true);
    }
  });

  it("every YouTube id is well-formed and matches its watch URL", () => {
    for (const item of LIBRARY) {
      if (!item.videoId) continue;
      expect(item.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(item.url).toBe(`https://www.youtube.com/watch?v=${item.videoId}`);
    }
  });

  it("vibes stay in the focused set", () => {
    for (const item of LIBRARY) {
      for (const v of item.vibes) expect(VIBES).toContain(v);
    }
  });

  it("every sermon and podcast maps to a registered ministry", () => {
    for (const item of LIBRARY) {
      if (item.type === "sermon" || item.type === "podcast") {
        if (item.type === "sermon") expect(item.ministry).toBeTruthy();
        if (item.ministry) expect(ministryByKey(item.ministry)).toBeTruthy();
      }
    }
  });

  it("required ministers are represented with playable sermons", () => {
    const speakers = new Set(
      LIBRARY.filter((i) => i.type === "sermon" && i.videoId).map((i) => i.author),
    );
    for (const name of [
      "Billy Graham",
      "Adrian Rogers",
      "David Jeremiah",
      "Allen Jackson",
      "Rick Warren",
      "James Dobson",
    ]) {
      expect(speakers.has(name), `missing sermons from ${name}`).toBe(true);
    }
  });

  it("ministries have official https URLs and verification dates", () => {
    for (const m of MINISTRIES) {
      expect(m.officialUrl).toMatch(/^https:\/\//);
      expect(m.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("approved churches (when added) carry the full record", () => {
    for (const c of APPROVED_CHURCHES) {
      expect(c.approved).toBe(true);
      expect(c.websiteUrl).toMatch(/^https:\/\//);
      expect(c.youtubeUrl).toMatch(/^https:\/\/www\.youtube\.com\//);
      expect(c.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("embed + artwork helpers", () => {
  it("YouTube items embed via youtube-nocookie and link to youtube.com", () => {
    const item = LIBRARY.find((i) => i.videoId)!;
    expect(getEmbedUrl(item)).toContain("youtube-nocookie.com/embed/");
    expect(getWatchUrl(item)).toContain("youtube.com/watch");
    expect(artworkUrl(item)).toContain(item.videoId);
  });

  it("link-only items have no embed but keep their official destination", () => {
    const linkOnly = LIBRARY.filter((i) => !i.videoId && !i.spotifyEmbed && !i.appleEmbed);
    for (const item of linkOnly) {
      expect(getEmbedUrl(item)).toBeNull();
      expect(getWatchUrl(item)).toBe(item.url);
    }
  });
});
