// TheDJCares — homepage Daily Encouragement selector.
//
// Completely independent from the full Daily Encouragement rotation
// (app/lib/dailyEncouragement.ts, still used by /today and the social
// posts). That rotation picks from the WHOLE curated library, including
// items with no verified inline media (a link-out-only podcast page, for
// instance) — fine for a page whose whole point is a link out, wrong for
// the homepage card, which promises "Play here" every single day. So this
// selector pulls only from sermons/podcasts that pass the site's one
// canonical isPlayable() check (videoId, spotifyEmbed/appleEmbed, or a
// direct audioUrl) — the exact same bar the Podcasts/Sermons play-here
// interaction and Daily Encouragement's own Spin already require.
//
// Selection mirrors videoOfTheDay.ts's own pattern: day N since launch
// picks item (N mod pool size) from the stable-sorted eligible list, so no
// pick repeats until the whole eligible pool has had its day.

import { daysBetweenDateKeys } from "./dailySocialCore";
import { isPlayable, LIBRARY, type MediaItem } from "./djCaresLibrary";

// Own anchor date — deliberately not shared with DJC_BRAND.startDate or
// VIDEO_OF_THE_DAY_START so this rotation stays uncoupled from either.
export const HOME_DAILY_PICK_START = "2026-07-12";

function isEligibleHomeDailyPick(item: MediaItem): boolean {
  return Boolean(
    (item.type === "sermon" || item.type === "podcast") &&
      item.active !== false &&
      item.id &&
      item.title &&
      item.author &&
      isPlayable(item),
  );
}

function dedupe(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function eligibleHomeDailyPicks(items: MediaItem[] = LIBRARY): MediaItem[] {
  return dedupe(items.filter(isEligibleHomeDailyPick));
}

// Deterministic full-pool rotation — same math as selectVideoOfTheDay /
// selectItemForDate. Never returns an item isPlayable() would reject.
export function selectHomeDailyPick(dateKey: string, items: MediaItem[] = LIBRARY): MediaItem | null {
  const eligible = eligibleHomeDailyPicks(items).sort((a, b) => a.id.localeCompare(b.id));
  if (!eligible.length) return null;

  const day = daysBetweenDateKeys(HOME_DAILY_PICK_START, dateKey);
  const index = ((day % eligible.length) + eligible.length) % eligible.length;
  return eligible[index];
}
