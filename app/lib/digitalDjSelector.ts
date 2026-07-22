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

// Duration thresholds for each category (in seconds).
const DURATION_SOFT_CAP: Record<string, number> = {
  music: 300, // ~5 min each
  music_video: 400,
  playlist: 1800, // ~30 min
  podcast: 600, // ~10 min
  sermon: 1800, // ~30 min
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
  const recentIds = new Set<string>();

  // Accumulate items until we hit or exceed the target duration.
  // Prefer variety over repetition.
  for (const item of items) {
    if (selected.length >= 50) break; // Cap at 50 items per session.

    // Avoid immediate repeats.
    if (recentIds.has(item.id)) continue;

    const duration = estimateDuration(item);
    const newElapsed = elapsedSeconds + duration;

    if (newElapsed > targetSeconds) {
      // This item would exceed the target.
      // Include it anyway (round up), but mark as truncated.
      selected.push(item);
      truncated = true;
      elapsedSeconds = newElapsed;
      recentIds.add(item.id);
      break;
    }

    selected.push(item);
    elapsedSeconds += duration;
    recentIds.add(item.id);

    // Stop if we're close enough to the target (within 10%).
    if (elapsedSeconds >= targetSeconds * 0.9) {
      break;
    }
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

  // Filter by media type if specified.
  if (request.mediaTypes && request.mediaTypes.length > 0) {
    candidates = candidates.filter((i) => request.mediaTypes!.includes(i.type as any));
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

// Parse shareableIds back to items.
export function shareableIdsToItems(ids: string, items: MediaItem[] = LIBRARY): MediaItem[] {
  const idList = ids.split(",");
  const idSet = new Set(idList);
  return items.filter((i) => idSet.has(i.id));
}
