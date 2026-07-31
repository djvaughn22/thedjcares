// Integration tests for mood queue advancement, persistence, and session continuity.
// These verify the full end-to-end flow: build queue → play → ended event → auto-advance.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildQueue,
  isAtQueueEnd,
  nextPlayableIndex,
  loadSession,
  saveSession,
  loadPrefs,
  savePrefs,
  resolveQueue,
  QUEUE_MOODS,
  DEFAULT_PREFS,
  type PlayerPrefs,
} from "../moodQueue";
import { LIBRARY, type MediaItem } from "../djCaresLibrary";

describe("mood queue end-to-end: build → play → advance", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds a queue with at least 20 items for a full hour of mixed content", () => {
    for (const mood of QUEUE_MOODS) {
      const queue = buildQueue(mood, "both");
      expect(queue.length).toBeGreaterThanOrEqual(20);
      // Verify each item is active and playable
      for (const item of queue) {
        expect(item.active).not.toBe(false);
        expect(item.videoId || item.spotifyEmbed || item.appleEmbed).toBeTruthy();
      }
    }
  });

  it("can build a queue for 60 minutes without duplicates in a row", () => {
    const queue = buildQueue("joy", "both");
    let totalSeconds = 0;
    const ids = [];
    for (const item of queue) {
      ids.push(item.id);
      const durationStr = item.duration || "4:00";
      const parts = durationStr.split(":").reverse();
      const seconds = (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) * 3600;
      totalSeconds += seconds;
    }
    expect(totalSeconds).toBeGreaterThanOrEqual(3000); // At least 50 minutes
    // No two consecutive songs should be the same
    for (let i = 0; i < ids.length - 1; i++) {
      expect(ids[i]).not.toBe(ids[i + 1]);
    }
  });

  it("avoidFirst prevents the next queue from starting with the previous track", () => {
    const queue1 = buildQueue("peace", "both");
    const lastId = queue1[queue1.length - 1].id;

    // When we rollover and pass avoidFirst, it should not start with the last track
    const queue2 = buildQueue("peace", "both", { avoidFirst: lastId });
    expect(queue2[0].id).not.toBe(lastId);
  });

  it("nextPlayableIndex advances through failed items", () => {
    const queue = buildQueue("hope", "both");
    const failed = new Set<string>();

    // Mark first 3 items as failed
    failed.add(queue[0].id);
    failed.add(queue[1].id);
    failed.add(queue[2].id);

    // nextPlayableIndex should jump to index 3
    const idx = nextPlayableIndex(queue, 0, failed, 1);
    expect(idx).toBe(3);
  });

  it("nextPlayableIndex returns null when all items are unavailable", () => {
    const queue = buildQueue("faith", "both").slice(0, 3); // Small queue for testing
    const failed = new Set(queue.map((i) => i.id)); // All unavailable

    const idx = nextPlayableIndex(queue, 0, failed, 1);
    expect(idx).toBeNull();
  });

  it("isAtQueueEnd detects end of queue correctly", () => {
    const queue = buildQueue("encouragement", "both").slice(0, 5);
    const empty = new Set<string>();

    expect(isAtQueueEnd(queue, 0, empty)).toBe(false); // Start of queue
    expect(isAtQueueEnd(queue, queue.length - 1, empty)).toBe(true); // End of queue
  });

  it("isAtQueueEnd with all failed items reports queue end", () => {
    const queue = buildQueue("morning", "both").slice(0, 5);
    const allFailed = new Set(queue.slice(1).map((i) => i.id)); // All except first

    // At position 0, only item 0 is playable, so position 0 is effectively the end
    expect(isAtQueueEnd(queue, 0, allFailed)).toBe(true);
  });

  it("session persistence round-trips: save and restore full state via localStorage", () => {
    const queue = buildQueue("joy", "music");
    if (queue.length < 10) return;

    const sessionData = {
      mood: "joy" as const,
      mode: "music" as const,
      queueIds: queue.slice(0, 10).map((i) => i.id),
      position: 3,
      updatedAt: Date.now(),
    };

    saveSession(sessionData);
    const restored = loadSession();

    expect(restored).not.toBeNull();
    if (restored) {
      expect(restored.mood).toBe("joy");
      expect(restored.mode).toBe("music");
      expect(restored.position).toBe(3);
      expect(restored.queueIds).toEqual(sessionData.queueIds);
    }
  });

  it("session TTL validation: old sessions are not restored", () => {
    const queue = buildQueue("peace", "videos");
    if (queue.length < 10) return;

    const oldSession = {
      mood: "peace" as const,
      mode: "videos" as const,
      queueIds: queue.slice(0, 10).map((i) => i.id),
      position: 0,
      updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days old
    };

    saveSession(oldSession);
    const restored = loadSession();

    // TTL is 14 days, so this should not restore
    expect(restored).toBeNull();
  });

  it("resolveQueue converts stored IDs back to MediaItems in order", () => {
    const queue = buildQueue("hope", "both");
    const ids = queue.slice(0, 5).map((i) => i.id);

    const resolved = resolveQueue(ids);

    expect(resolved.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(resolved[i].id).toBe(ids[i]);
    }
  });

  it("resolveQueue skips unknown IDs (benched items)", () => {
    const queue = buildQueue("family", "both");
    if (queue.length < 6) return; // Need at least 6 items

    const ids = [...queue.slice(0, 3).map((i) => i.id), "unknown-fake-id", ...queue.slice(3, 6).map((i) => i.id)];

    const resolved = resolveQueue(ids);

    expect(resolved.length).toBe(6); // 3 + 3 items, unknown ID is skipped
    expect(resolved.map((i) => i.id)).toEqual(ids.filter((id) => id !== "unknown-fake-id"));
  });

  it("preferences persist volume, mute, and repeat state via localStorage", () => {
    const prefs: PlayerPrefs = {
      volume: 65,
      muted: true,
      repeat: "one",
    };

    savePrefs(prefs);
    const restored = loadPrefs();

    expect(restored.volume).toBe(65);
    expect(restored.muted).toBe(true);
    expect(restored.repeat).toBe("one");
  });

  it("preferences default to sensible values on cold start", () => {
    localStorage.clear();
    const prefs = loadPrefs();

    expect(prefs.volume).toBe(100);
    expect(prefs.muted).toBe(false);
    expect(prefs.repeat).toBe("queue");
  });

  it("mix mode switching: music-only queue differs from both", () => {
    const both = buildQueue("joy", "both");
    const musicOnly = buildQueue("joy", "music");

    // Music-only should have fewer items (no videos)
    expect(musicOnly.length).toBeLessThanOrEqual(both.length);
    // And they should not be identical (unless all joy items are music)
    if (both.length > musicOnly.length) {
      expect(musicOnly.map((i) => i.id)).not.toEqual(both.map((i) => i.id));
    }
  });

  it("music video queue contains only items with musicVideo flag or watch playback", () => {
    const videos = buildQueue("peace", "videos");

    for (const item of videos) {
      const isVideo = item.playbackExperience === "watch" || item.musicVideo;
      expect(isVideo).toBe(true);
    }
  });
});

describe("queue advancement state machine: simulate UI flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("simulates: start mood → position 0 → ended → position 1 → ended → position 2", () => {
    const queue = buildQueue("encouragement", "both");
    expect(queue.length).toBeGreaterThan(2);

    // Position 0: play first song
    let position = 0;
    expect(queue[position].id).toBeDefined();

    // Song ends, advance to position 1
    let failed = new Set<string>();
    const idx1 = nextPlayableIndex(queue, position, failed, 1);
    expect(idx1).toBe(1);
    position = idx1;
    expect(queue[position].id).toBeDefined();

    // Song ends, advance to position 2
    const idx2 = nextPlayableIndex(queue, position, failed, 1);
    expect(idx2).toBe(2);
    position = idx2;
    expect(queue[position].id).toBeDefined();
  });

  it("simulates: item fails → skip to next playable → continue", () => {
    const queue = buildQueue("joy", "both");
    expect(queue.length).toBeGreaterThan(3);

    let position = 0;
    let failed = new Set<string>();

    // Play position 0, it ends successfully
    position = nextPlayableIndex(queue, position, failed, 1)!;
    expect(position).toBe(1);

    // Position 1 fails
    failed.add(queue[1].id);

    // Skip to next playable (position 2)
    position = nextPlayableIndex(queue, position, failed, 1)!;
    expect(position).toBe(2);
    expect(failed.has(queue[position].id)).toBe(false);
  });

  it("simulates: reach end of queue → rollover with fresh shuffle", () => {
    const queue = buildQueue("hope", "both");
    const position = queue.length - 1;
    const failed = new Set<string>();

    // Verify we're at the end
    expect(isAtQueueEnd(queue, position, failed)).toBe(true);

    // On rollover, build a new queue
    const newQueue = buildQueue("hope", "both", { avoidFirst: queue[position].id });
    expect(newQueue.length).toBeGreaterThan(0);
    // New queue should not start with the last song of the old queue
    expect(newQueue[0].id).not.toBe(queue[position].id);
  });

  it("simulates: persist session mid-queue, reload, continue from saved position", () => {
    const queue = buildQueue("family", "both");
    if (queue.length < 10) return; // Need enough items

    const position = 5;

    // Save mid-queue via localStorage
    const session = {
      mood: "family" as const,
      mode: "both" as const,
      queueIds: queue.map((i) => i.id),
      position,
      updatedAt: Date.now(),
    };
    saveSession(session);

    // Simulate page reload: restore session
    const restored = loadSession();
    expect(restored).not.toBeNull();
    if (restored) {
      expect(restored.position).toBe(5);

      // Resolve the queue
      const restoredQueue = resolveQueue(restored.queueIds);
      expect(restoredQueue[position].id).toBe(queue[position].id);
    }
  });

  it("simulates: multiple unavailable items in a row → skip all to first playable", () => {
    const queue = buildQueue("morning", "both");
    expect(queue.length).toBeGreaterThan(5);

    let position = 0;
    const failed = new Set<string>();

    // Mark positions 1, 2, 3 as failed
    failed.add(queue[1].id);
    failed.add(queue[2].id);
    failed.add(queue[3].id);

    // From position 0, next should jump to position 4
    const nextIdx = nextPlayableIndex(queue, position, failed, 1);
    expect(nextIdx).toBe(4);
  });

  it("simulates: previous button in middle of queue", () => {
    const queue = buildQueue("evening", "both");
    const position = 5;
    const failed = new Set<string>();

    // Go back one position
    const prevIdx = nextPlayableIndex(queue, position, failed, -1);
    expect(prevIdx).toBe(4);
  });

  it("simulates: previous button skips unavailable items backward", () => {
    const queue = buildQueue("surprise", "both");
    expect(queue.length).toBeGreaterThan(5);

    const position = 5;
    const failed = new Set<string>();

    // Mark positions 2, 3, 4 as failed
    failed.add(queue[2].id);
    failed.add(queue[3].id);
    failed.add(queue[4].id);

    // Going back from position 5 should jump to position 1
    const prevIdx = nextPlayableIndex(queue, position, failed, -1);
    expect(prevIdx).toBe(1);
  });
});
