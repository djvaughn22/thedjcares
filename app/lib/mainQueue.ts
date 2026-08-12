// The homepage's continuous queue — Daily Encouragement (or whatever video
// the visitor picks) followed by the rest of the video catalog. Pure
// functions here, same split as moodQueue.ts: HomeClient owns the React
// state, these decide what it should become.

import { isAtQueueEnd, shuffle } from "./moodQueue";
import type { MediaItem } from "./djCaresLibrary";

// Anchor item first, then the rest of the playable video catalog in stable
// order (minus the anchor itself, in case it's already one of them).
export function buildVideoQueueFrom(anchor: MediaItem, videos: MediaItem[]): MediaItem[] {
  const rest = videos.filter((i) => i.id !== anchor.id && Boolean(i.videoId));
  return [anchor, ...rest];
}

// Shuffle only touches the UPCOMING portion — whatever already played, and
// the item currently playing, stay put (position doesn't move, current
// playback isn't interrupted). Turning shuffle off restores catalog order
// for what's left, using `catalogOrder` as the canonical source.
export function reorderUpcoming(
  queue: MediaItem[],
  position: number,
  shuffleOn: boolean,
  catalogOrder: MediaItem[],
  rand: () => number = Math.random,
): MediaItem[] {
  const before = queue.slice(0, position + 1);
  if (shuffleOn) {
    return [...before, ...shuffle(queue.slice(position + 1), rand)];
  }
  const beforeIds = new Set(before.map((i) => i.id));
  const after = catalogOrder.filter((i) => !beforeIds.has(i.id));
  return [...before, ...after];
}

// Whether playback should stop cleanly after the queue's last playable item,
// vs continue (wrap to the top via nextPlayableIndex's own modulo) because
// Repeat is on.
export function shouldStopAtQueueEnd(
  queue: MediaItem[],
  position: number,
  failed: ReadonlySet<string>,
  repeatOn: boolean,
): boolean {
  if (repeatOn) return false;
  return isAtQueueEnd(queue, position, failed);
}
