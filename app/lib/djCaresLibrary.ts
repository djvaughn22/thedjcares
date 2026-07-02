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
  url?: string; // canonical external link
  summary?: string;
  tags?: string[];
  featured?: boolean;
  isVideo?: boolean;
  videoProvider?: "youtube";
  videoId?: string;
  playlistId?: string; // if set, embeds a whole YouTube playlist
  embedUrl?: string; // optional explicit embed; otherwise derived
};

// Top-level filter groups (chips). "All" is added in the UI.
export const LIBRARY_FILTERS: { label: string; categories: LibraryCategory[] }[] = [
  { label: "Messages", categories: ["Message", "Pastor"] },
  { label: "Music", categories: ["Music", "Song"] },
  { label: "Books", categories: ["Book"] },
  { label: "Lessons", categories: ["Lesson"] },
  { label: "Resources", categories: ["Resource"] },
];

const v = (
  id: string,
  title: string,
  author: string,
  videoId: string,
  category: LibraryCategory,
  tag: string,
  summary: string,
  featured = false,
): LibraryItem => ({
  id,
  title,
  author,
  category,
  videoId,
  tags: [tag],
  summary,
  featured,
  isVideo: true,
  videoProvider: "youtube",
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

// All items are real picks DJ already curated — now playable in-app.
// Do not invent pastors, books, songs, or lessons; add them only when they're real.
export const DJ_CARES_LIBRARY: LibraryItem[] = [
  // Featured message
  v(
    "biblical-habit-rewires-your-brain",
    "This Biblical Habit Rewires Your Brain",
    "",
    "JW6fd-ZWavs",
    "Message",
    "encouragement",
    "A reminder that repeated time with Scripture, prayer, and God-focused habits can reshape what we notice, how we respond, and where we turn when life gets heavy. Save this as encouragement, not pressure — one faithful habit at a time.",
    true,
  ),

  // Worship music
  v("graves-into-gardens", "Graves Into Gardens", "Elevation Worship", "oDEO2N7EgZI", "Music", "Worship", "One of the most powerful modern worship songs — turn it up."),
  v("gratitude", "Gratitude", "Brandon Lake", "OSTzXwJYxkU", "Music", "Gratitude", "Simple, honest, and hits every time."),
  v("way-maker", "Way Maker", "Sinach", "iJCV_2H9xD0", "Music", "Faith", "A declaration of faith over any hard season."),
  v("king-of-kings", "King of Kings", "Hillsong Worship", "BpFubBhIRe4", "Music", "Worship", "A sweeping reminder of the whole gospel story."),
  v("goodness-of-god", "Goodness of God", "Bethel Music / Jenn Johnson", "XEatn9OiASc", "Music", "Healing", "For when you need to remember He has been faithful."),
  v("greater-things", "Greater Things", "Shawn McDonald", "RhH5ew4kfD8", "Music", "Prayer", "Quiet, prayerful, honest."),
  v("even-if", "Even If", "MercyMe", "blSAJXFNnnc", "Music", "Healing", "Written from real pain. For the hard days."),
  v("same-god", "Same God", "Elevation Worship", "xLlNqhRpHk4", "Music", "Faith", "He was faithful then. He is faithful now."),
  v("christ-be-all-around-me", "Christ Be All Around Me", "All Sons & Daughters", "BxLvfylP2UA", "Music", "Morning", "Slow, quiet, prayerful — good for morning."),
  v("holy-water", "Holy Water", "We The Kingdom", "b7A5x_bLo1s", "Music", "Grace", "About grace, honesty, and needing Jesus."),
  v("i-can-only-imagine", "I Can Only Imagine", "MercyMe", "Q5NUqCjY0BA", "Music", "Eternal", "A classic. If you don't know the story behind it, look it up."),
  v("what-a-beautiful-name", "What a Beautiful Name", "Hillsong Worship", "nQWFzMvCfLE", "Music", "Worship", "One of the best modern hymns written in a generation."),

  // Messages / sermons
  v("dont-give-the-enemy-a-seat", "Don't Give the Enemy a Seat at Your Table", "Louie Giglio", "RkqPbOh5NfI", "Message", "Identity", "Powerful teaching on spiritual warfare and identity."),
  v("the-prodigal-sons", "The Prodigal Sons", "Tim Keller", "H-UAmXBpNXo", "Message", "Grace", "The best sermon ever preached on Luke 15. Period."),
  v("forgotten-god", "Forgotten God", "Francis Chan", "H8mENj5Lj-A", "Message", "Spirit", "A sobering look at how the church often ignores the Holy Spirit."),
  v("kingdom-man", "Kingdom Man", "Tony Evans", "BQXR7IlkL2U", "Message", "Purpose", "On identity, purpose, and being who God called you to be."),
  v("youre-not-who-they-say", "You're Not Who They Say You Are", "Steven Furtick", "TIQFH1Jq1JM", "Message", "Identity", "For anyone carrying someone else's label."),
  v("why-i-believe-the-bible", "Why I Choose to Believe the Bible", "Voddie Baucham", "KgDEiGEoExM", "Message", "Truth", "Thoughtful, direct, apologetics for real questions."),
];

// Privacy-friendly embed URL for any video/playlist item.
export function getEmbedUrl(item: LibraryItem): string | null {
  if (item.embedUrl) return item.embedUrl;
  if (item.playlistId) return `https://www.youtube-nocookie.com/embed/videoseries?list=${item.playlistId}`;
  if (!item.isVideo) return null;
  if (item.videoProvider === "youtube" && item.videoId) {
    return `https://www.youtube-nocookie.com/embed/${item.videoId}`;
  }
  return null;
}

// Canonical "watch on YouTube" link for a video/playlist item.
export function getWatchUrl(item: LibraryItem): string {
  if (item.playlistId) return `https://www.youtube.com/playlist?list=${item.playlistId}`;
  if (item.videoProvider === "youtube" && item.videoId) {
    return `https://www.youtube.com/watch?v=${item.videoId}`;
  }
  return item.url ?? "#";
}

// Parse a pasted blob into a playlist id + individual video ids.
// Accepts full URLs (watch?v=, youtu.be/, /embed/, /shorts/, list=) or bare 11-char ids.
export function parseYouTube(input: string): { playlistId: string | null; videoIds: string[] } {
  const playlistMatch = input.match(/[?&]list=([A-Za-z0-9_-]+)/);
  const playlistId = playlistMatch ? playlistMatch[1] : null;

  const videoIds: string[] = [];
  const add = (id: string) => {
    if (id && id.length === 11 && !videoIds.includes(id)) videoIds.push(id);
  };

  const patterns = [
    /(?:youtube\.com\/watch\?[^ ]*v=)([A-Za-z0-9_-]{11})/g,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/g,
    /(?:youtube(?:-nocookie)?\.com\/embed\/)([A-Za-z0-9_-]{11})/g,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) add(m[1]);
  }

  // Bare ids on their own line/token (only when no URL context present).
  for (const token of input.split(/[\s,]+/)) {
    if (/^[A-Za-z0-9_-]{11}$/.test(token) && !token.includes("/")) add(token);
  }

  return { playlistId, videoIds };
}

// Build a playable library item from a user-pasted video id.
export function userVideoItem(videoId: string): LibraryItem {
  return {
    id: `user-${videoId}`,
    title: "From your playlist",
    category: "Music",
    author: "Your picks",
    isVideo: true,
    videoProvider: "youtube",
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// Build a playable whole-playlist item.
export function userPlaylistItem(playlistId: string): LibraryItem {
  return {
    id: `user-playlist-${playlistId}`,
    title: "Your Playlist",
    category: "Music",
    author: "Your picks",
    summary: "Every video in the playlist you dropped in — plays right here.",
    playlistId,
  };
}
