import { describe, expect, it } from "vitest";
import { historyLimit, pickNext, pushHistory, spinPool } from "../spin";
import { LIBRARY, type MediaItem } from "../djCaresLibrary";

const fakeItem = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  id,
  type: "music",
  title: id,
  author: "Test",
  vibes: ["Joy"],
  url: `https://www.youtube.com/watch?v=${id}`,
  videoId: "x".repeat(11),
  verified: "2026-07-18",
  ...extra,
});

describe("spinPool", () => {
  it("only returns playable approved items", () => {
    for (const item of spinPool({ category: "all" })) {
      expect(item.videoId || item.spotifyEmbed || item.appleEmbed).toBeTruthy();
      expect(item.active).not.toBe(false);
    }
  });

  it("respects media type", () => {
    for (const t of ["music", "podcast", "sermon", "playlist"] as const) {
      const pool = spinPool({ category: t });
      expect(pool.length).toBeGreaterThan(0);
      expect(pool.every((i) => i.type === t)).toBe(true);
    }
  });

  it("videos category = official music videos only", () => {
    const pool = spinPool({ category: "videos" });
    expect(pool.every((i) => i.playbackExperience === "watch")).toBe(true);
  });

  it("respects vibe and ministry filters", () => {
    const joy = spinPool({ category: "all", vibe: "Joy" });
    expect(joy.length).toBeGreaterThan(0);
    expect(joy.every((i) => i.vibes.includes("Joy"))).toBe(true);

    const bgea = spinPool({ category: "sermon", ministry: "bgea" });
    expect(bgea.length).toBeGreaterThan(0);
    expect(bgea.every((i) => i.ministry === "bgea")).toBe(true);
  });

  it("excludes benched items", () => {
    const items = [fakeItem("a"), fakeItem("b", { active: false })];
    const pool = spinPool({ category: "all" }, items);
    expect(pool.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("pickNext", () => {
  const pool5 = ["a", "b", "c", "d", "e"].map((id) => fakeItem(id));

  it("returns null on an empty pool and the only item on a pool of one", () => {
    expect(pickNext([], [])).toBeNull();
    expect(pickNext([fakeItem("only")], ["only"])?.id).toBe("only");
  });

  it("never immediately repeats the current item (pool ≥ 2)", () => {
    const pool2 = [fakeItem("a"), fakeItem("b")];
    let current = "a";
    for (let i = 0; i < 50; i += 1) {
      const next = pickNext(pool2, [current]);
      expect(next!.id).not.toBe(current);
      current = next!.id;
    }
  });

  it("avoids the recent-history window, not just the last item", () => {
    for (let i = 0; i < 50; i += 1) {
      const next = pickNext(pool5, ["a", "b", "c", "d"]);
      expect(next!.id).toBe("e");
    }
  });

  it("resets safely when history covers the whole pool", () => {
    const history = ["a", "b", "c", "d", "e"];
    for (let i = 0; i < 50; i += 1) {
      const next = pickNext(pool5, history);
      expect(next).not.toBeNull();
      expect(next!.id).not.toBe("e"); // still never the current item
    }
  });

  it("visits the whole pool before repeating (history at limit)", () => {
    let history: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < pool5.length; i += 1) {
      const next = pickNext(pool5, history)!;
      seen.add(next.id);
      history = pushHistory(history, next.id, pool5.length);
    }
    expect(seen.size).toBe(pool5.length);
  });
});

describe("history sizing", () => {
  it("scales with the pool and never blocks every item", () => {
    expect(historyLimit(0)).toBe(0);
    expect(historyLimit(1)).toBe(0);
    expect(historyLimit(2)).toBe(1);
    expect(historyLimit(5)).toBe(4);
    expect(historyLimit(100)).toBe(8);
  });

  it("pushHistory trims to the limit and dedupes", () => {
    expect(pushHistory(["a", "b"], "a", 3)).toEqual(["b", "a"]);
    expect(pushHistory(["a", "b", "c", "d"], "e", 3)).toHaveLength(2);
    expect(pushHistory([], "a", 1)).toEqual([]);
  });
});

describe("real library pools", () => {
  it("every category has a healthy playable pool", () => {
    expect(spinPool({ category: "music" }).length).toBeGreaterThanOrEqual(20);
    expect(spinPool({ category: "playlist" }).length).toBeGreaterThanOrEqual(5);
    expect(spinPool({ category: "podcast" }).length).toBeGreaterThanOrEqual(2);
    // The sermon catalog runs deep — ~50 per approved minister.
    expect(spinPool({ category: "sermon" }).length).toBeGreaterThanOrEqual(300);
  });

  it("every ministry with sermons can be spun", () => {
    const keys = new Set(
      LIBRARY.filter((i) => i.type === "sermon").map((i) => i.ministry),
    );
    for (const key of keys) {
      expect(spinPool({ category: "sermon", ministry: key! }).length).toBeGreaterThan(0);
    }
  });
});
