// TheDJCares — "Video of the Day" selector for the homepage hero record.
//
// Completely independent from Daily Encouragement (app/lib/dailyEncouragement.ts).
// Daily Encouragement rotates the WHOLE curated library — music, sermons,
// podcasts, playlists — including items with no video and no inline
// playback at all. The hero vinyl needs the opposite guarantee: every pick
// MUST have a real thumbnail (for the record label) and MUST play inline
// on-site (for the record to actually spin). So this pulls only from the
// same music-video catalog that already powers the Music Videos section
// (itemsOfType("music")), not from the encouragement/podcast collection.
//
// Selection mirrors dailyEncouragement.ts's own pattern: day N since launch
// picks item (N mod pool size) from the stable-sorted eligible list, so no
// video repeats until the whole catalog has had its day.

import { daysBetweenDateKeys } from "./dailySocialCore";
import { itemsOfType, type MediaItem } from "./djCaresLibrary";

// Own anchor date — deliberately not shared with DJC_BRAND.startDate so
// this rotation stays uncoupled from the encouragement engine's config.
export const VIDEO_OF_THE_DAY_START = "2026-07-12";

// Eligible: a real music video — has a YouTube id (so artworkUrl() always
// returns a real thumbnail and the existing DJPlayer can always play it
// inline), plus the same real-attribution bar every eligible item meets.
export function eligibleVideosOfTheDay(items: MediaItem[] = itemsOfType("music")): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.type !== "music" || !item.videoId) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return Boolean(item.id && item.title && item.author);
  });
}

// Deterministic full-catalog rotation — same math as selectItemForDate.
export function selectVideoOfTheDay(
  dateKey: string,
  items: MediaItem[] = itemsOfType("music"),
): MediaItem | null {
  const eligible = eligibleVideosOfTheDay(items).sort((a, b) => a.id.localeCompare(b.id));
  if (!eligible.length) return null;

  const day = daysBetweenDateKeys(VIDEO_OF_THE_DAY_START, dateKey);
  const index = ((day % eligible.length) + eligible.length) % eligible.length;
  return eligible[index];
}
