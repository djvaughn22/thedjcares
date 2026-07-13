// TheDJCares — Daily Encouragement content adapter for the shared
// Daily Social Engine (see app/lib/dailySocialCore.ts).
//
// One approved item per day from DJ's curated Encouragement Library —
// nothing outside the library is ever selected, nothing is downloaded or
// re-uploaded, and the card is an original TheDJCares recommendation design
// that links people to the authorized source. Selection is a deterministic
// rotation: day N since launch picks item (N mod library size) from the
// stable-sorted eligible list, so no item repeats until the whole library
// has had its day.

import {
  activeHashtags,
  captionMarkerForDate,
  daysBetweenDateKeys,
  formatFullDate,
  isValidDateKey,
  type DailySocialBrandConfig,
  type DailySocialPost,
} from "./dailySocialCore";
import {
  DJ_CARES_LIBRARY,
  getEmbedUrl,
  getWatchUrl,
  type LibraryCategory,
  type LibraryItem,
} from "./djCaresLibrary";

export const DJC_BRAND: DailySocialBrandConfig = {
  brand: "thedjcares",
  siteName: "TheDJCares.com",
  siteUrl: "https://thedjcares.com",
  markerPrefix: "Daily Encouragement",
  hashtags: ["#TheDJCares", "#Jesus", "#Gospel", "#ChristianMusic", "#DailyEncouragement"],
  startDate: "2026-07-12",
  version: 1,
};

// The daily label always matches the selected content type.
export function typeLabelFor(category: LibraryCategory): string {
  switch (category) {
    case "Message":
    case "Pastor":
      return "Sermon of the Day";
    case "Song":
      return "Song for Today";
    case "Music":
      return "Playlist for Today";
    case "Lesson":
      return "Teaching for Today";
    case "Book":
      return "Book for Today";
    case "Resource":
    default:
      return "Encouragement for Today";
  }
}

// An item is eligible only when it has a real destination and DJ's own
// title/attribution/summary — no placeholders, no unverified content.
export function eligibleItems(items: LibraryItem[] = DJ_CARES_LIBRARY): LibraryItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);

    const destination = getWatchUrl(item);
    return Boolean(
      item.id &&
        item.title &&
        item.author &&
        item.summary &&
        destination.startsWith("http"),
    );
  });
}

// Deterministic full-library rotation; `offset` is the admin's
// "choose another eligible item" control.
export function selectItemForDate(
  dateKey: string,
  items: LibraryItem[] = DJ_CARES_LIBRARY,
  offset = 0,
): LibraryItem | null {
  const eligible = eligibleItems(items).sort((a, b) => a.id.localeCompare(b.id));
  if (!eligible.length) return null;

  const day = daysBetweenDateKeys(DJC_BRAND.startDate, dateKey);
  const index = ((day + offset) % eligible.length + eligible.length) % eligible.length;
  return eligible[index];
}

export function buildEncouragementCaption(dateKey: string, item: LibraryItem): string {
  const label = typeLabelFor(item.category);

  return [
    captionMarkerForDate(DJC_BRAND, dateKey),
    "",
    `${label}: ${item.title} — ${item.author}.`,
    "",
    item.summary ?? "",
    "",
    "Open today's pick through the link in our bio.",
    "TheDJCares.com/today",
    "",
    "Follow Jesus. Love God. Pray.",
    "",
    activeHashtags(DJC_BRAND.hashtags).join(" "),
  ].join("\n");
}

export type DailyEncouragement = {
  post: DailySocialPost;
  item: LibraryItem;
  label: string;
  embedUrl: string | null;
  sourceUrl: string;
};

// Confirms the item's source still works before a real publish.
// YouTube ids are checked via oEmbed (the library's own dead-id lesson);
// other links must answer without a server error.
export async function verifyItemSource(item: LibraryItem): Promise<string | null> {
  try {
    if (item.videoProvider === "youtube" && item.videoId) {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${item.videoId}`)}&format=json`,
      );
      return res.ok ? null : `YouTube oEmbed returned ${res.status} for ${item.videoId}`;
    }

    const destination = getWatchUrl(item);
    const res = await fetch(destination, { method: "GET", redirect: "follow" });
    return res.status < 500 ? null : `source returned ${res.status}: ${destination}`;
  } catch {
    return `source unreachable for ${item.id}`;
  }
}

export async function buildDailyEncouragement(
  dateKey: string,
  options: { offset?: number; forPublish?: boolean } = {},
): Promise<DailyEncouragement> {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const item = selectItemForDate(dateKey, DJ_CARES_LIBRARY, options.offset ?? 0);
  if (!item) {
    throw new Error("no eligible item in the curated library");
  }

  if (options.forPublish) {
    const problem = await verifyItemSource(item);
    if (problem) {
      throw new Error(problem);
    }
  }

  const label = typeLabelFor(item.category);

  return {
    item,
    label,
    embedUrl: getEmbedUrl(item),
    sourceUrl: getWatchUrl(item),
    post: {
      brand: DJC_BRAND.brand,
      date: dateKey,
      fullDate: formatFullDate(dateKey),
      timezone: "America/Chicago",
      version: DJC_BRAND.version,
      contentId: item.id,
      typeLabel: label,
      title: item.title,
      caption: buildEncouragementCaption(dateKey, item),
      hashtags: activeHashtags(DJC_BRAND.hashtags),
      imagePath: `/api/social/daily-encouragement/${dateKey}.png`,
      imageFileName: `daily-encouragement-${dateKey}-1080x1350.png`,
      pagePath: `/today/${dateKey}`,
      parityKeys: [item.title, item.author ?? "", label],
    },
  };
}
