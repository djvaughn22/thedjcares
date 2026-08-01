// Session history: track what the user has listened to in this session.
// Prevents repeats, enables "already listened" indicators, powers journey feedback.

import { type MediaItem } from "./djCaresLibrary";

export type SessionHistory = {
  playedIds: Set<string>; // Items user has heard (end-to-end or started)
  playOrder: string[]; // Chronological order for journey visualization
  startTime: number;
};

const SESSION_HISTORY_KEY = "djc-session-history";
const SESSION_HISTORY_TTL = 1000 * 60 * 60 * 4; // 4 hours (a listening session)

export function createSessionHistory(): SessionHistory {
  return {
    playedIds: new Set(),
    playOrder: [],
    startTime: Date.now(),
  };
}

export function markAsPlayed(history: SessionHistory, itemId: string): SessionHistory {
  if (!history.playedIds.has(itemId)) {
    history.playedIds.add(itemId);
    history.playOrder.push(itemId);
  }
  return history;
}

export function hasPlayed(history: SessionHistory, itemId: string): boolean {
  return history.playedIds.has(itemId);
}

export function getPlayedCount(history: SessionHistory): number {
  return history.playedIds.size;
}

export function getPlayOrder(history: SessionHistory): string[] {
  return [...history.playOrder];
}

export function isSessionStale(history: SessionHistory): boolean {
  return Date.now() - history.startTime > SESSION_HISTORY_TTL;
}

export function saveSessionHistory(history: SessionHistory): void {
  try {
    const serialized = {
      playedIds: Array.from(history.playedIds),
      playOrder: history.playOrder,
      startTime: history.startTime,
    };
    window.localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(serialized));
  } catch {
    // Storage unavailable
  }
}

export function loadSessionHistory(): SessionHistory {
  try {
    const raw = window.localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return createSessionHistory();

    const data = JSON.parse(raw);
    const history: SessionHistory = {
      playedIds: new Set(data.playedIds || []),
      playOrder: data.playOrder || [],
      startTime: data.startTime || Date.now(),
    };

    // Clear if stale
    if (isSessionStale(history)) {
      return createSessionHistory();
    }

    return history;
  } catch {
    return createSessionHistory();
  }
}

export function clearSessionHistory(): void {
  try {
    window.localStorage.removeItem(SESSION_HISTORY_KEY);
  } catch {
    // Ignore
  }
}
