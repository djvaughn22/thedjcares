// TheDJCares — curated Encouragement Library
// A growing, hand-picked collection. Add only real, vetted items here.
// Video items with isVideo + videoProvider + videoId render as in-app players.

export type LibraryCategory =
  | "Message"
  | "Pastor"
  | "Book"
  | "Lesson"
  | "Music"
  | "Song"
  | "Resource";

export type LibraryItem = {
  id: string;
  title: string;
  category: LibraryCategory;
  author?: string; // author / source
  url: string; // canonical external link
  summary: string;
  tags: string[];
  featured?: boolean;
  isVideo?: boolean;
  videoProvider?: "youtube";
  videoId?: string;
  embedUrl?: string; // optional explicit embed; otherwise derived from provider + id
};

// The only public item for now — a real, vetted video.
// Do not invent pastors, books, songs, or lessons; add them only when they're real.
export const DJ_CARES_LIBRARY: LibraryItem[] = [
  {
    id: "biblical-habit-rewires-your-brain",
    title: "This Biblical Habit Rewires Your Brain",
    category: "Message",
    url: "https://youtu.be/JW6fd-ZWavs",
    summary:
      "A reminder that repeated time with Scripture, prayer, and God-focused habits can reshape what we notice, how we respond, and where we turn when life gets heavy. Save this as encouragement, not pressure — one faithful habit at a time.",
    tags: ["Scripture", "prayer", "habits", "encouragement"],
    featured: true,
    isVideo: true,
    videoProvider: "youtube",
    videoId: "JW6fd-ZWavs",
    embedUrl: "https://www.youtube-nocookie.com/embed/JW6fd-ZWavs",
  },
];

// Privacy-friendly embed URL for any video item (falls back to nocookie by id).
export function getEmbedUrl(item: LibraryItem): string | null {
  if (!item.isVideo) return null;
  if (item.embedUrl) return item.embedUrl;
  if (item.videoProvider === "youtube" && item.videoId) {
    return `https://www.youtube-nocookie.com/embed/${item.videoId}`;
  }
  return null;
}

// Canonical "watch on YouTube" link for a video item.
export function getWatchUrl(item: LibraryItem): string {
  if (item.videoProvider === "youtube" && item.videoId) {
    return `https://www.youtube.com/watch?v=${item.videoId}`;
  }
  return item.url;
}
