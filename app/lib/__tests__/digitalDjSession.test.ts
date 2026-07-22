// Tests for the visual-session helpers: artwork derivation is catalog-bound,
// swaps stay in the approved library, durations stay honest, and console
// prefill parameters are whitelist-validated.

import { describe, it, expect } from "vitest";
import {
  attribution,
  describeIntent,
  hasType,
  longerOf,
  mediaLook,
  parsePrefill,
  sessionDuration,
  shorterOf,
  swapItem,
  thumbUrl,
  typeFirst,
} from "../digitalDjSession";
import { LIBRARY, type MediaItem } from "../djCaresLibrary";

const make = (over: Partial<MediaItem>): MediaItem => ({
  id: "t",
  type: "music",
  title: "T",
  author: "A",
  url: "https://example.com",
  vibes: ["Gospel"],
  verified: "2026-01-01",
  ...over,
});

describe("thumbUrl — artwork only from stored videoIds", () => {
  it("derives i.ytimg URLs from the item's stored videoId", () => {
    const item = make({ videoId: "iJCV_2H9xD0" });
    expect(thumbUrl(item, "large")).toBe("https://i.ytimg.com/vi/iJCV_2H9xD0/hqdefault.jpg");
    expect(thumbUrl(item, "small")).toBe("https://i.ytimg.com/vi/iJCV_2H9xD0/mqdefault.jpg");
  });

  it("returns null (→ local placeholder) when there is no videoId", () => {
    expect(thumbUrl(make({ videoId: undefined }))).toBeNull();
  });

  it("every catalog item with a videoId gets a thumbnail; others never do", () => {
    for (const item of LIBRARY) {
      const url = thumbUrl(item);
      if (item.videoId) expect(url).toContain(item.videoId);
      else expect(url).toBeNull();
    }
  });
});

describe("mediaLook badges", () => {
  it("distinguishes music videos from plain music", () => {
    expect(mediaLook(make({ musicVideo: true })).badge).toBe("Music Video");
    expect(mediaLook(make({})).badge).toBe("Music");
    expect(mediaLook(make({ type: "sermon" })).badge).toBe("Sermon");
    expect(mediaLook(make({ type: "podcast" })).badge).toBe("Podcast");
    expect(mediaLook(make({ type: "playlist" })).badge).toBe("Playlist");
  });
});

describe("attribution", () => {
  it("adds the ministry when known and distinct", () => {
    const sermon = LIBRARY.find((i) => i.ministry === "bgea")!;
    expect(attribution(sermon)).toContain("Billy Graham Evangelistic Association");
  });
  it("is just the author otherwise", () => {
    expect(attribution(make({ author: "Phil Wickham" }))).toBe("Phil Wickham");
  });
});

describe("sessionDuration honesty", () => {
  it("sums known durations exactly and reports allKnown", () => {
    const items = [make({ duration: "10:00" }), make({ id: "u", duration: "5:00" })];
    expect(sessionDuration(items)).toEqual({ minutes: 15, allKnown: true });
  });
  it("flags estimated totals when any duration is unknown", () => {
    const items = [make({ duration: "10:00" }), make({ id: "u" })];
    expect(sessionDuration(items).allKnown).toBe(false);
  });
});

describe("duration ladder", () => {
  it("steps down and up within 5–60", () => {
    expect(shorterOf(10)).toBe(5);
    expect(shorterOf(60)).toBe(30);
    expect(shorterOf(5)).toBe(5);
    expect(longerOf(10)).toBe(20);
    expect(longerOf(60)).toBe(60);
  });
});

describe("swapItem", () => {
  const musicVideo = LIBRARY.find((i) => i.type === "music" && i.musicVideo)!;
  const sermon = LIBRARY.find((i) => i.type === "sermon")!;

  it("replaces with the same kind from the approved catalog only", () => {
    const items = [musicVideo, sermon];
    const next = swapItem(items, 0, LIBRARY, () => 0);
    expect(next).not.toBeNull();
    const replacement = next![0];
    expect(replacement.id).not.toBe(musicVideo.id);
    expect(replacement.type).toBe("music");
    expect(replacement.musicVideo).toBe(true);
    expect(LIBRARY.some((i) => i.id === replacement.id)).toBe(true);
    // The untouched slot stays put.
    expect(next![1].id).toBe(sermon.id);
  });

  it("never picks something already in the session", () => {
    const items = [musicVideo, sermon];
    for (let r = 0; r < 10; r++) {
      const next = swapItem(items, 1, LIBRARY, () => r / 10);
      expect(next![1].id).not.toBe(sermon.id);
      expect(next![1].id).not.toBe(musicVideo.id);
    }
  });

  it("returns null when the catalog has no alternative", () => {
    const only = make({ videoId: "abc" });
    expect(swapItem([only], 0, [only])).toBeNull();
  });
});

describe("typeFirst reorder", () => {
  it("brings the kind to the front, keeping both groups stable", () => {
    const m1 = make({ id: "m1" });
    const m2 = make({ id: "m2" });
    const s1 = make({ id: "s1", type: "sermon" });
    const s2 = make({ id: "s2", type: "sermon" });
    expect(typeFirst([s1, m1, s2, m2], "music").map((i) => i.id)).toEqual(["m1", "m2", "s1", "s2"]);
    expect(hasType([s1, m1], "sermon")).toBe(true);
    expect(hasType([m1, m2], "sermon")).toBe(false);
  });
});

describe("describeIntent — plain language, no JSON", () => {
  it("reads like a sentence fragment", () => {
    expect(
      describeIntent({ durationMinutes: 10, needs: ["encouragement"], mediaTypes: ["music"] }),
    ).toBe("10 minutes · encouragement · music");
  });
  it("includes a requested creator", () => {
    expect(describeIntent({ needs: ["joy"], requestedCreator: "Billy Graham" })).toBe("joy · Billy Graham");
  });
  it("is empty for null", () => {
    expect(describeIntent(null)).toBe("");
  });
});

describe("parsePrefill — whitelist only", () => {
  it("accepts valid values", () => {
    const p = parsePrefill(new URLSearchParams("t=20&need=peace&media=sermon"));
    expect(p).toEqual({ duration: 20, need: "peace", media: "sermon" });
  });
  it("ignores anything off-list — no injection through query params", () => {
    const p = parsePrefill(
      new URLSearchParams("t=17&need=javascript:alert(1)&media=https://evil.example/img.jpg"),
    );
    expect(p).toEqual({});
  });
});
