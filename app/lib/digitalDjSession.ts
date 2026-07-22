// Presentation + session-shaping helpers for Digital DJ.
//
// Everything here derives from stored, approved catalog data only. Thumbnails
// come exclusively from an item's validated YouTube videoId — never from
// query parameters, AI output, or any other outside value. Items without a
// safe artwork source get an honest local category placeholder.

import {
  activeItems,
  isPlayable,
  LIBRARY,
  ministryByKey,
  type MediaItem,
} from "./djCaresLibrary";
import { estimateDuration } from "./digitalDjSelector";

// Structural shape shared by the AI parser's intent and the selector request.
type IntentLike = {
  durationMinutes?: number;
  mediaTypes?: string[];
  needs?: string[];
  requestedCreator?: string;
};

// --- artwork -----------------------------------------------------------------

// Thumbnail derived ONLY from the catalog item's stored videoId.
// "small" = mqdefault (320×180) for queue rows; "large" = hqdefault (480×360).
export function thumbUrl(item: MediaItem, size: "small" | "large" = "large"): string | null {
  if (!item.videoId) return null;
  const file = size === "small" ? "mqdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${item.videoId}/${file}.jpg`;
}

// The visible identity of each media kind — badge + local placeholder art.
export type MediaLook = { badge: string; emoji: string; tint: string };

export function mediaLook(item: MediaItem): MediaLook {
  if (item.type === "music" && item.musicVideo) return { badge: "Music Video", emoji: "🎬", tint: "#7c5cd6" };
  switch (item.type) {
    case "music":
      return { badge: "Music", emoji: "🎵", tint: "#6d5bb8" };
    case "playlist":
      return { badge: "Playlist", emoji: "💿", tint: "#5b6ab8" };
    case "podcast":
      return { badge: "Podcast", emoji: "🎙️", tint: "#4f7ab0" };
    case "sermon":
      return { badge: "Sermon", emoji: "✝️", tint: "#8a5ca8" };
    default:
      return { badge: "Media", emoji: "🎧", tint: "#6d5bb8" };
  }
}

// Attribution line: author, plus the ministry when we know it.
export function attribution(item: MediaItem): string {
  const ministry = ministryByKey(item.ministry);
  if (ministry && ministry.name !== item.author) return `${item.author} · ${ministry.name}`;
  return item.author;
}

// --- honest durations --------------------------------------------------------

// Sum a session's length. `allKnown` distinguishes "12 min" from "about 12 min".
export function sessionDuration(items: MediaItem[]): { minutes: number; allKnown: boolean } {
  let seconds = 0;
  let allKnown = items.length > 0;
  for (const item of items) {
    if (!item.duration) allKnown = false;
    seconds += estimateDuration(item);
  }
  return { minutes: Math.max(1, Math.round(seconds / 60)), allKnown };
}

// The 5/10/20/30/60 ladder used everywhere.
export const DURATION_STEPS = [5, 10, 20, 30, 60] as const;

export function shorterOf(minutes: number): number {
  const shorter = [...DURATION_STEPS].reverse().find((d) => d < minutes);
  return shorter ?? DURATION_STEPS[0];
}

export function longerOf(minutes: number): number {
  const longer = DURATION_STEPS.find((d) => d > minutes);
  return longer ?? DURATION_STEPS[DURATION_STEPS.length - 1];
}

// --- session shaping ---------------------------------------------------------

// The "like" identity used for swapping: keeps music videos with music videos.
type LikeKind = "music" | "music_video" | "sermon" | "podcast" | "playlist";

function likeKind(item: MediaItem): LikeKind {
  if (item.type === "music") return item.musicVideo ? "music_video" : "music";
  return item.type;
}

// Swap one session item for a fresh catalog match: same kind, shared vibe
// when possible, never something already in the session. Returns the new
// items array, or null when the catalog has nothing else to offer.
export function swapItem(
  items: MediaItem[],
  index: number,
  catalog: MediaItem[] = LIBRARY,
  rand: () => number = Math.random,
): MediaItem[] | null {
  const target = items[index];
  if (!target) return null;
  const inSession = new Set(items.map((i) => i.id));
  const kind = likeKind(target);

  const pool = activeItems(catalog).filter(
    (i) => isPlayable(i) && !inSession.has(i.id) && likeKind(i) === kind,
  );
  if (pool.length === 0) return null;

  const sharedVibe = pool.filter((i) => i.vibes.some((v) => target.vibes.includes(v)));
  const candidates = sharedVibe.length > 0 ? sharedVibe : pool;
  const replacement = candidates[Math.floor(rand() * candidates.length)];

  const next = [...items];
  next[index] = replacement;
  return next;
}

// Stable reorder: bring one media kind to the front, keep both groups' order.
export function typeFirst(items: MediaItem[], kind: "music" | "sermon"): MediaItem[] {
  const matches = items.filter((i) => i.type === kind);
  const rest = items.filter((i) => i.type !== kind);
  return [...matches, ...rest];
}

export function hasType(items: MediaItem[], kind: "music" | "sermon"): boolean {
  return items.some((i) => i.type === kind);
}

// --- plain-language AI summary ----------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  music: "music",
  music_video: "music videos",
  sermon: "sermons",
  podcast: "podcasts",
};

const NEED_LABELS: Record<string, string> = {
  encouragement: "encouragement",
  joy: "joy",
  peace: "peace",
  hope: "hope",
  faith: "faith",
  family: "family",
  morning: "morning",
  evening: "evening",
  surprise: "surprise me",
};

// "10 minutes · encouragement · music" — never raw JSON or field names.
export function describeIntent(intent: IntentLike | null): string {
  if (!intent) return "";
  const parts: string[] = [];
  if (intent.durationMinutes) parts.push(`${intent.durationMinutes} minutes`);
  if (intent.needs?.length) parts.push(intent.needs.map((n) => NEED_LABELS[n] ?? n).join(", "));
  if (intent.requestedCreator) parts.push(intent.requestedCreator);
  if (intent.mediaTypes?.length) parts.push(intent.mediaTypes.map((t) => TYPE_LABELS[t] ?? t).join(" + "));
  return parts.join(" · ");
}

// --- homepage console prefill ------------------------------------------------

// /digital-dj?t=10&need=peace&media=music — every value is whitelist-checked;
// anything else is ignored.
export function parsePrefill(params: URLSearchParams): {
  duration?: number;
  need?: string;
  media?: string;
} {
  const out: { duration?: number; need?: string; media?: string } = {};
  const t = Number(params.get("t"));
  if ((DURATION_STEPS as readonly number[]).includes(t)) out.duration = t;
  const need = params.get("need");
  if (need && need in NEED_LABELS) out.need = need;
  const media = params.get("media");
  if (media && media in TYPE_LABELS) out.media = media;
  return out;
}
