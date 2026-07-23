// The shuffle behind "Spin Another" — controlled randomness.
//
// Rules: select only from the approved library, respect the chosen media
// type / vibe / ministry, never repeat the current item, and remember a short
// recent-play history so small pools still feel fresh. Pure functions; the
// page keeps history in localStorage.

import {
  activeItems,
  isPlayable,
  LIBRARY,
  type MediaItem,
  type MediaType,
  type MinistryKey,
  type Vibe,
} from "./djCaresLibrary";

// "videos" = official music videos only; "all" = the whole playable library.
export type SpinCategory = MediaType | "videos" | "all";

export type SpinFilter = {
  category: SpinCategory;
  vibe?: Vibe | null;
  ministry?: MinistryKey | null;
};

export const HISTORY_KEY = "djc-spin-history";

// Everything the player can actually play, matching the filter.
export function spinPool(filter: SpinFilter, items: MediaItem[] = LIBRARY): MediaItem[] {
  return activeItems(items).filter((i) => {
    if (!isPlayable(i)) return false;
    if (filter.category === "videos") {
      if (i.playbackExperience !== "watch") return false;
    } else if (filter.category !== "all" && i.type !== filter.category) {
      return false;
    }
    if (filter.vibe && !i.vibes.includes(filter.vibe)) return false;
    if (filter.ministry && i.ministry !== filter.ministry) return false;
    return true;
  });
}

// How much history a pool can afford: up to 8, but always leave at least one
// pickable item so tiny pools reset safely instead of dead-ending.
export function historyLimit(poolSize: number): number {
  return Math.max(0, Math.min(8, poolSize - 1));
}

// Pick the next item: never the current one (when the pool allows), and
// avoid the recent-history window so we don't cycle among two or three items.
export function pickNext(
  pool: MediaItem[],
  history: string[],
  rand: () => number = Math.random,
): MediaItem | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const recent = new Set(history.slice(-historyLimit(pool.length)));
  let candidates = pool.filter((i) => !recent.has(i.id));

  if (candidates.length === 0) {
    // History covered the whole pool (filter changed) — reset, but still
    // never immediately repeat what just played.
    const current = history[history.length - 1];
    candidates = pool.filter((i) => i.id !== current);
  }

  return candidates[Math.floor(rand() * candidates.length)] ?? null;
}

// Append to history, trimmed to what this pool size can afford.
export function pushHistory(history: string[], id: string, poolSize: number): string[] {
  const next = [...history.filter((h) => h !== id), id];
  const limit = historyLimit(poolSize);
  return limit > 0 ? next.slice(-limit) : [];
}

export function loadHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: string[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Private mode — spinning still works, it just forgets between visits.
  }
}
