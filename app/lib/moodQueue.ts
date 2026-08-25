// The mood queue — the engine behind the mood-based listening experience.
//
// A visitor picks a mood (the same nine needs the Digital DJ speaks) and a
// mix (music, music videos, or both) and gets a queue built from every
// matching, playable, mood-eligible item in the approved library. The queue:
//
// - only ever selects from djCaresLibrary.ts (never a recommendation feed)
// - applies the P0 mood-integrity gate (djMoodReview.ts) — flagged and
//   unreviewed items never serve a requested feeling
// - shuffles for variety, plays start to end, then repeats with a fresh
//   shuffle that never opens with the item that just finished
// - skips failed items without ending the session
// - survives page refreshes via one small, whitelist-validated localStorage
//   record (ids only — everything is re-resolved against the catalog on load)
//
// Pure functions everywhere; the deck owns React state.

import { activeItems, LIBRARY, type MediaItem } from "./djCaresLibrary";
import { eligibleForSomeNeed, estimateDuration, type DjNeed } from "./digitalDjSelector";

export type MixMode = "music" | "videos" | "both";

export const MIX_MODES: { id: MixMode; label: string; emoji: string }[] = [
  { id: "both", label: "Both", emoji: "🎧" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "videos", label: "Music Videos", emoji: "🎬" },
];

export const QUEUE_MOODS: DjNeed[] = [
  "encouragement",
  "joy",
  "peace",
  "hope",
  "faith",
  "family",
  "morning",
  "evening",
  "surprise",
];

// Is this catalog item a proper official music video (vs an audio-first
// song upload)? Items opt in with `musicVideo: true`.
export function isMusicVideo(item: MediaItem): boolean {
  return item.musicVideo === true;
}

// Everything a mood queue may draw from: active music with a playable
// YouTube id (the one provider whose player we can fully control), matching
// the requested mix, and eligible for the requested mood. "surprise" matches
// the whole recommendable music library. Excludes static/still-image videos
// without real playback (no closed captions support).
export function moodPool(mood: DjNeed, mode: MixMode, items: MediaItem[] = LIBRARY): MediaItem[] {
  return activeItems(items).filter((i) => {
    if (i.type !== "music" || !i.videoId) return false;
    // Exclude static images / lyric videos without real video content
    // Only include items tagged as actual music videos or listen experiences
    if (!i.playbackExperience || !["listen", "watch"].includes(i.playbackExperience)) return false;
    if (mode === "music" && isMusicVideo(i)) return false;
    if (mode === "videos" && !isMusicVideo(i)) return false;
    return eligibleForSomeNeed(i, [mood]);
  });
}

// Total playable minutes a mood offers for a mix — the number the catalog
// validation holds at 60+ for every published mood.
export function moodPoolMinutes(mood: DjNeed, mode: MixMode, items: MediaItem[] = LIBRARY): number {
  const seconds = moodPool(mood, mode, items).reduce((s, i) => s + estimateDuration(i), 0);
  return Math.round(seconds / 60);
}

export function shuffle<T>(list: T[], rand: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Build a fresh queue: the full shuffled pool. `avoidFirst` keeps a rollover
// (or "new mix" after something played) from immediately repeating the item
// that just finished — whenever an alternative exists. `avoidAlready` filters
// out items the user has already heard this session, keeping content fresh.
export function buildQueue(
  mood: DjNeed,
  mode: MixMode,
  opts: { avoidFirst?: string; avoidAlready?: Set<string>; items?: MediaItem[]; rand?: () => number } = {},
): MediaItem[] {
  const rand = opts.rand ?? Math.random;
  let pool = moodPool(mood, mode, opts.items ?? LIBRARY);

  // Filter out items already heard this session (unless exhausted)
  if (opts.avoidAlready && opts.avoidAlready.size > 0) {
    const unheard = pool.filter((i) => !opts.avoidAlready!.has(i.id));
    if (unheard.length > 0) {
      pool = unheard;
    }
    // If all items heard, use full pool (wrap around for infinite listening)
  }

  let queue = shuffle(pool, rand);
  if (queue.length > 1 && opts.avoidFirst && queue[0].id === opts.avoidFirst) {
    const swapWith = 1 + Math.floor(rand() * (queue.length - 1));
    [queue[0], queue[swapWith]] = [queue[swapWith], queue[0]];
  }
  return queue;
}

// Where playback goes when an item finishes (or the visitor taps Next).
// Skips failed items; wraps at the end. Returns null only when nothing in the
// queue is playable at all — the caller should then rebuild or show recovery.
export function nextPlayableIndex(
  queue: MediaItem[],
  fromIndex: number,
  failed: ReadonlySet<string>,
  direction: 1 | -1 = 1,
): number | null {
  if (queue.length === 0) return null;
  for (let step = 1; step <= queue.length; step++) {
    const idx = (fromIndex + direction * step + queue.length * step) % queue.length;
    if (!failed.has(queue[idx].id)) return idx;
  }
  return null;
}

// Has the queue reached its final playable item?
export function isAtQueueEnd(queue: MediaItem[], index: number, failed: ReadonlySet<string>): boolean {
  for (let i = index + 1; i < queue.length; i++) {
    if (!failed.has(queue[i].id)) return false;
  }
  return true;
}

// --- session persistence -----------------------------------------------------

export const MOOD_SESSION_KEY = "djc-mood-session";
export const PLAYER_PREFS_KEY = "djc-player-prefs";

export type MoodSession = {
  mood: DjNeed;
  mode: MixMode;
  queueIds: string[];
  position: number;
  updatedAt: number;
};

export type PlayerPrefs = {
  volume: number; // 0–100
  muted: boolean;
  repeat: "queue" | "one";
};

// A gentle 25% is the starting volume for every controllable player (site
// volume slider, YouTube players, native <audio>) — loud enough to hear,
// quiet enough not to blast a listener who didn't expect sound, especially
// older visitors. See PLAYER_PREFS_VERSION below for how a visitor with an
// old saved preference gets moved off the previous 100% default.
export const DEFAULT_PREFS: PlayerPrefs = { volume: 25, muted: false, repeat: "queue" };

// Bump this whenever a stored default needs a one-time migration on load
// (see parsePrefs). v1 records predate this field entirely (no `version`
// key at all) and carried the old 100% blast default.
export const PLAYER_PREFS_VERSION = 2;

// Sessions older than this restore to a fresh mix instead (stale queues are
// worse than a new one — the catalog may have changed underneath them).
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function serializeSession(s: MoodSession): string {
  return JSON.stringify(s);
}

// Re-validate everything: mood/mode against whitelists, ids against the
// catalog, position within bounds. A record that fails any check is ignored.
export function parseSession(raw: string | null, items: MediaItem[] = LIBRARY, now: number = Date.now()): MoodSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    if (!QUEUE_MOODS.includes(p.mood as DjNeed)) return null;
    if (!MIX_MODES.some((m) => m.id === p.mode)) return null;
    if (!Array.isArray(p.queueIds) || typeof p.position !== "number" || typeof p.updatedAt !== "number") return null;
    if (now - p.updatedAt > SESSION_MAX_AGE_MS) return null;
    const byId = new Map(activeItems(items).map((i) => [i.id, i]));
    const queueIds = p.queueIds.filter((id): id is string => typeof id === "string" && byId.has(id));
    if (queueIds.length === 0) return null;
    const position = Math.min(Math.max(0, Math.floor(p.position)), queueIds.length - 1);
    return { mood: p.mood as DjNeed, mode: p.mode as MixMode, queueIds, position, updatedAt: p.updatedAt };
  } catch {
    return null;
  }
}

export function resolveQueue(ids: string[], items: MediaItem[] = LIBRARY): MediaItem[] {
  const byId = new Map(activeItems(items).map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((i): i is MediaItem => Boolean(i));
}

export function parsePrefs(raw: string | null): PlayerPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const storedVersion = typeof p.version === "number" ? p.version : 1;
    const rawVolume = typeof p.volume === "number" && p.volume >= 0 && p.volume <= 100 ? Math.round(p.volume) : undefined;
    const muted = typeof p.muted === "boolean" ? p.muted : DEFAULT_PREFS.muted;
    const repeat = p.repeat === "one" ? "one" : "queue";
    // A pre-v2 record at the old 100% default (or with no volume at all)
    // never reflected a deliberate choice — every v1 visitor landed on 100
    // whether they touched the control or not — so it's moved to the new
    // gentle default, once. Any other saved value is a real listener
    // choice and survives the migration untouched.
    const volume =
      storedVersion < PLAYER_PREFS_VERSION && (rawVolume === undefined || rawVolume === 100)
        ? DEFAULT_PREFS.volume
        : (rawVolume ?? DEFAULT_PREFS.volume);
    return { volume, muted, repeat };
  } catch {
    return DEFAULT_PREFS;
  }
}

// Moving the slider itself to zero mutes; above zero always unmutes.
export function volumeFromSlider(value: number): Pick<PlayerPrefs, "volume" | "muted"> {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return clamped <= 0 ? { volume: 0, muted: true } : { volume: clamped, muted: false };
}

// Unmuting restores the last nonzero volume — the current prefs value when
// it's still nonzero (a plain Mute-button press never zeroes it), otherwise
// the caller's remembered last-nonzero value, falling back to the default.
export function volumeFromMuteToggle(prefs: PlayerPrefs, lastNonZeroVolume: number): Pick<PlayerPrefs, "volume" | "muted"> {
  if (!prefs.muted) return { volume: prefs.volume, muted: true };
  const restored = prefs.volume > 0 ? prefs.volume : lastNonZeroVolume > 0 ? lastNonZeroVolume : DEFAULT_PREFS.volume;
  return { volume: restored, muted: false };
}

// Storage wrappers — private mode just forgets between visits.
export function loadSession(): MoodSession | null {
  try {
    return parseSession(window.localStorage.getItem(MOOD_SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(s: MoodSession | null): void {
  try {
    if (s) window.localStorage.setItem(MOOD_SESSION_KEY, serializeSession(s));
    else window.localStorage.removeItem(MOOD_SESSION_KEY);
  } catch {
    // Storage unavailable — the session just won't survive a refresh.
  }
}

export function loadPrefs(): PlayerPrefs {
  try {
    return parsePrefs(window.localStorage.getItem(PLAYER_PREFS_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: PlayerPrefs): void {
  try {
    window.localStorage.setItem(PLAYER_PREFS_KEY, JSON.stringify({ ...p, version: PLAYER_PREFS_VERSION }));
  } catch {
    // Storage unavailable.
  }
}
