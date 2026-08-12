// The homepage's continuous queue (Daily Encouragement → Videos): building
// the anchored queue, shuffling only the upcoming portion, and deciding
// whether to stop or wrap at the end. HomeClient wires these into React
// state; these tests exercise the pure decisions directly.

import { describe, expect, it } from "vitest";
import { buildVideoQueueFrom, reorderUpcoming, shouldStopAtQueueEnd } from "../mainQueue";
import type { MediaItem } from "../djCaresLibrary";

const video = (id: string): MediaItem => ({
  id,
  type: "music",
  playbackExperience: "watch",
  title: id,
  author: "Test Artist",
  url: `https://youtube.com/watch?v=${id}`,
  videoId: id,
  vibes: [],
  verified: "2026-01-01",
});

const notVideo = (id: string): MediaItem => ({
  id,
  type: "sermon",
  playbackExperience: "sermon",
  title: id,
  author: "Test Speaker",
  url: `https://example.com/${id}`,
  vibes: [],
  verified: "2026-01-01",
});

describe("buildVideoQueueFrom", () => {
  const catalog = [video("a"), video("b"), video("c")];

  it("puts the anchor first, then the rest of the catalog", () => {
    const q = buildVideoQueueFrom(video("today"), catalog);
    expect(q.map((i) => i.id)).toEqual(["today", "a", "b", "c"]);
  });

  it("doesn't duplicate the anchor if it's already in the catalog", () => {
    const q = buildVideoQueueFrom(catalog[1], catalog);
    expect(q.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("excludes catalog items without a real video id", () => {
    const withDud = [...catalog, notVideo("d")];
    const q = buildVideoQueueFrom(video("today"), withDud);
    expect(q.map((i) => i.id)).toEqual(["today", "a", "b", "c"]);
  });

  it("still anchors a non-video daily pick (e.g. a sermon of the day)", () => {
    const q = buildVideoQueueFrom(notVideo("sermon-of-the-day"), catalog);
    expect(q.map((i) => i.id)).toEqual(["sermon-of-the-day", "a", "b", "c"]);
  });
});

describe("reorderUpcoming", () => {
  const queue = [video("a"), video("b"), video("c"), video("d"), video("e")];
  const catalogOrder = [video("b"), video("c"), video("d"), video("e"), video("a")];

  it("never moves the currently playing item or anything already played", () => {
    const reordered = reorderUpcoming(queue, 1, true, catalogOrder, () => 0);
    expect(reordered.slice(0, 2).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("shuffling on reorders only the upcoming slice", () => {
    const reordered = reorderUpcoming(queue, 0, true, catalogOrder, () => 0);
    expect(reordered[0].id).toBe("a"); // untouched: it's the current item
    expect(reordered.map((i) => i.id).sort()).toEqual(["a", "b", "c", "d", "e"]); // nothing lost
    expect(reordered.map((i) => i.id)).not.toEqual(queue.map((i) => i.id)); // but reordered
  });

  it("shuffling off restores canonical catalog order for what's left", () => {
    const shuffled = reorderUpcoming(queue, 0, true, catalogOrder, () => 0);
    const restored = reorderUpcoming(shuffled, 0, false, catalogOrder);
    expect(restored.map((i) => i.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("shouldStopAtQueueEnd", () => {
  const queue = [video("a"), video("b"), video("c")];
  const noneFailed = new Set<string>();

  it("does not stop mid-queue", () => {
    expect(shouldStopAtQueueEnd(queue, 0, noneFailed, false)).toBe(false);
  });

  it("stops at the last item when Repeat is off", () => {
    expect(shouldStopAtQueueEnd(queue, 2, noneFailed, false)).toBe(true);
  });

  it("does not stop at the last item when Repeat is on", () => {
    expect(shouldStopAtQueueEnd(queue, 2, noneFailed, true)).toBe(false);
  });

  it("treats a trailing run of failed items as the end too", () => {
    const failed = new Set(["c"]);
    expect(shouldStopAtQueueEnd(queue, 1, failed, false)).toBe(true);
  });
});
