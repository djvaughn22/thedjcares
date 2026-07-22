// Deterministic Digital DJ selector — zero-token path for media recommendations.
// Filters the approved catalog by duration, media type, mood, and optional creator preferences.
// Works completely without OpenAI.

import {
  activeItems,
  getWatchUrl,
  isPlayable,
  LIBRARY,
  ministryByKey,
  type MediaItem,
  type MinistryKey,
  type Vibe,
} from "./djCaresLibrary";
import { spinPool, type SpinCategory } from "./spin";

export type DjNeed =
  | "encouragement"
  | "joy"
  | "peace"
  | "hope"
  | "faith"
  | "family"
  | "morning"
  | "evening"
  | "surprise";

// Map needs to relevant vibes and preferences.
export const NEED_TO_VIBES: Record<DjNeed, Vibe[]> = {
  encouragement: ["Gospel", "Hope", "Faith"],
  joy: ["Joy", "Worship"],
  peace: ["Peace", "Worship", "Prayer"],
  hope: ["Hope", "Gospel"],
  faith: ["Faith", "Gospel"],
  family: ["Family", "Worship"],
  morning: ["Hope", "Worship", "Joy"],
  evening: ["Peace", "Prayer", "Worship"],
  surprise: ["Gospel", "Worship", "Joy", "Hope", "Peace", "Faith"],
};

export type DigitalDjRequest = {
  durationMinutes: number; // 5, 10, 20, 30, or 60
  mediaTypes?: Array<"music" | "music_video" | "sermon" | "podcast">;
  needs?: DjNeed[];
  requestedCreator?: string; // ministry name or artist to prefer
  familyFriendly?: boolean;
};

export type DigitalDjResult = {
  items: MediaItem[];
  durationMinutes: number;
  requestedMinutes: number;
  truncated: boolean; // true if we hit duration limit mid-item
};

// Parse duration string to seconds. Examples: "4:32" → 272, "1:08:02" → 3682
export function parseDurationString(dur: string | undefined): number | null {
  if (!dur) return null;
  const parts = dur.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    const [min, sec] = parts;
    return min * 60 + sec;
  }
  if (parts.length === 3) {
    const [hr, min, sec] = parts;
    return hr * 3600 + min * 60 + sec;
  }
  return null;
}

// Estimate item duration in seconds. Defaults if no duration field.
export function estimateDuration(item: MediaItem): number {
  if (item.duration) {
    const parsed = parseDurationString(item.duration);
    if (parsed) return parsed;
  }
  // Fallback estimates by type.
  const type = item.type;
  if (type === "music") {
    return item.musicVideo ? 300 : 240; // Music video ~5 min, song ~4 min
  }
  if (type === "playlist") return 1800; // ~30 min
  if (type === "podcast") return 600; // ~10 min
  if (type === "sermon") return 1800; // ~30 min
  return 300; // Default
}

// Filter by needs (vibes + creators).
function filterByNeeds(
  items: MediaItem[],
  needs: DjNeed[] | undefined,
  requestedCreator: string | undefined,
): MediaItem[] {
  if (!needs || needs.length === 0) {
    // No needs specified — return all.
    if (!requestedCreator) return items;
    // But filter by creator if specified.
    return items.filter((i) => creatorMatches(i, requestedCreator));
  }

  // Collect all vibes for requested needs.
  const vibes = new Set<Vibe>();
  for (const need of needs) {
    const needVibes = NEED_TO_VIBES[need];
    if (needVibes) {
      for (const v of needVibes) {
        vibes.add(v);
      }
    }
  }

  // Filter to items with at least one matching vibe.
  let filtered = items.filter((i) => i.vibes.some((v) => vibes.has(v)));

  // Secondary filter by creator if specified.
  if (requestedCreator) {
    const creatorMatched = filtered.filter((i) => creatorMatches(i, requestedCreator));
    // If we found matches, use them; otherwise fall back to vibes alone.
    if (creatorMatched.length > 0) filtered = creatorMatched;
  }

  return filtered;
}

// Check if an item matches a requested creator (ministry name, artist name, etc).
function creatorMatches(item: MediaItem, query: string): boolean {
  const lower = query.toLowerCase();
  // Match ministry by key or name.
  if (item.ministry) {
    const ministry = ministryByKey(item.ministry);
    if (ministry) {
      if (ministry.key.includes(lower) || ministry.name.toLowerCase().includes(lower)) {
        return true;
      }
    }
  }
  // Match author directly.
  if (item.author.toLowerCase().includes(lower)) {
    return true;
  }
  return false;
}

// Select items to fill the requested duration.
export function selectForDuration(
  items: MediaItem[],
  requestedMinutes: number,
): DigitalDjResult {
  if (items.length === 0) {
    return { items: [], durationMinutes: 0, requestedMinutes, truncated: false };
  }

  const targetSeconds = requestedMinutes * 60;
  const selected: MediaItem[] = [];
  let elapsedSeconds = 0;
  let truncated = false;

  // Greedy fill that prefers items which actually FIT the remaining time
  // (in shuffled order, so sessions stay varied). Only when nothing in the
  // pool fits at all does the session take the closest full-length match
  // and mark itself truncated — never "a long sermon because it came first".
  const pool = items.filter((i, idx) => items.findIndex((j) => j.id === i.id) === idx);
  while (selected.length < 50) {
    const remaining = targetSeconds - elapsedSeconds;
    if (remaining <= targetSeconds * 0.1) break; // filled to ≥90%

    const fitIndex = pool.findIndex((i) => estimateDuration(i) <= remaining);
    if (fitIndex >= 0) {
      const [item] = pool.splice(fitIndex, 1);
      selected.push(item);
      elapsedSeconds += estimateDuration(item);
      continue;
    }

    if (selected.length === 0 && pool.length > 0) {
      // Nothing in the whole pool fits the request — take the shortest
      // available full item as the honest closest match.
      let best = 0;
      for (let i = 1; i < pool.length; i++) {
        if (estimateDuration(pool[i]) < estimateDuration(pool[best])) best = i;
      }
      const [item] = pool.splice(best, 1);
      selected.push(item);
      elapsedSeconds += estimateDuration(item);
      truncated = true;
    }
    break;
  }

  return {
    items: selected,
    durationMinutes: Math.round(elapsedSeconds / 60),
    requestedMinutes,
    truncated,
  };
}

// Main selector: filter, sort, and select media for a Digital DJ request.
export function selectMediaForDj(
  request: DigitalDjRequest,
  items: MediaItem[] = LIBRARY,
): DigitalDjResult {
  // Start with playable items.
  let candidates = activeItems(items).filter((i) => isPlayable(i));

  // Filter by media type if specified. "music_video" is not a catalog type —
  // it means music items flagged as proper official videos.
  if (request.mediaTypes && request.mediaTypes.length > 0) {
    const wants = new Set<string>(request.mediaTypes);
    candidates = candidates.filter((i) => {
      if (i.type === "music") {
        return wants.has("music") || (wants.has("music_video") && i.musicVideo === true);
      }
      return wants.has(i.type);
    });
  }

  // Filter by needs (vibes + creator preference).
  candidates = filterByNeeds(candidates, request.needs, request.requestedCreator);

  // Shuffle for variety (deterministic but randomized order per session).
  candidates = shuffleItems(candidates);

  // Select items to fill the requested duration.
  return selectForDuration(candidates, request.durationMinutes);
}

// Simple shuffle using crypto.getRandomValues for better randomness.
function shuffleItems(items: MediaItem[]): MediaItem[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Format a result for sharing: just the IDs, no user text.
export function resultToShareableIds(result: DigitalDjResult): string {
  return result.items.map((i) => i.id).join(",");
}

// Parse shareableIds back to items. Unknown/tampered ids simply match
// nothing; input is capped so an oversized query string can't do harm.
export const MAX_SHARED_IDS = 60;

export function shareableIdsToItems(ids: string, items: MediaItem[] = LIBRARY): MediaItem[] {
  const idSet = new Set(ids.slice(0, 2000).split(",").slice(0, MAX_SHARED_IDS));
  return items.filter((i) => idSet.has(i.id));
}
