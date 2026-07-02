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
  search?: string; // fallback: no verified embeddable id — link to a reliable YouTube search
  appleEmbed?: string; // embed.music.apple.com URL — plays Apple Music in-app
  spotifyEmbed?: string; // open.spotify.com/embed URL — plays Spotify in-app
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

// Reliable search-link card (no verified embeddable id — never 404s).
const s = (
  id: string,
  title: string,
  author: string,
  search: string,
  category: LibraryCategory,
  tag: string,
  summary: string,
): LibraryItem => ({ id, title, author, category, tags: [tag], summary, search });

// All items are real picks DJ already curated.
// Video IDs were verified live via YouTube oEmbed (2026-07); the ones that
// couldn't be confidently resolved fall back to a reliable YouTube search.
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

  // Worship music (verified live IDs)
  v("graves-into-gardens", "Graves Into Gardens", "Elevation Worship", "KwX1f2gYKZ4", "Music", "Worship", "One of the most powerful modern worship songs — turn it up."),
  v("gratitude", "Gratitude", "Brandon Lake", "dQdfs5S6jyA", "Music", "Gratitude", "Simple, honest, and hits every time."),
  v("way-maker", "Way Maker", "Sinach", "iJCV_2H9xD0", "Music", "Faith", "A declaration of faith over any hard season."),
  v("king-of-kings", "King of Kings", "Hillsong Worship", "dQl4izxPeNU", "Music", "Worship", "A sweeping reminder of the whole gospel story."),
  v("goodness-of-god", "Goodness of God", "Bethel Music / Jenn Johnson", "n0FBb6hnwTo", "Music", "Healing", "For when you need to remember He has been faithful."),
  v("even-if", "Even If", "MercyMe", "B6fA35Ved-Y", "Music", "Healing", "Written from real pain. For the hard days."),
  v("same-god", "Same God", "Elevation Worship", "LawxIZE9ePE", "Music", "Faith", "He was faithful then. He is faithful now."),
  v("christ-be-all-around-me", "Christ Be All Around Me", "All Sons & Daughters", "cmge-ycIkoo", "Music", "Morning", "Slow, quiet, prayerful — good for morning."),
  v("holy-water", "Holy Water", "We The Kingdom", "7KLQ2AXQmtA", "Music", "Grace", "About grace, honesty, and needing Jesus."),
  v("i-can-only-imagine", "I Can Only Imagine", "MercyMe", "N_lrrq_opng", "Music", "Eternal", "A classic. If you don't know the story behind it, look it up."),
  v("what-a-beautiful-name", "What a Beautiful Name", "Hillsong Worship", "nQWFzMvCfLE", "Music", "Worship", "One of the best modern hymns written in a generation."),
  // Couldn't confidently resolve a correct official upload — reliable search link:
  s("greater-things", "Greater Things", "Shawn McDonald", "Greater Things Shawn McDonald", "Music", "Prayer", "Quiet, prayerful, honest."),

  // Messages / sermons (verified live IDs)
  v("dont-give-the-enemy-a-seat", "Don't Give the Enemy a Seat at Your Table", "Louie Giglio", "_mLgS63cObI", "Message", "Identity", "Powerful teaching on spiritual warfare and identity."),
  v("the-prodigal-sons", "The Prodigal Sons", "Tim Keller", "lsTzXI7cJGA", "Message", "Grace", "The best sermon ever preached on Luke 15. Period."),
  v("thats-not-who-you-are", "That's Not Who You Are", "Steven Furtick", "KQQMGSvUf2U", "Message", "Identity", "For anyone carrying someone else's label."),
  v("forgotten-god", "Forgotten God", "Francis Chan", "sWMjg7CxIKk", "Message", "Spirit", "A sobering look at how the church often ignores the Holy Spirit."),
  v("kingdom-man", "Kingdom Man", "Tony Evans", "xjNyrYmEiW0", "Message", "Purpose", "On identity, purpose, and being who God called you to be."),
  v("why-i-believe-the-bible", "Why I Choose to Believe the Bible", "Voddie Baucham", "nMfKlqMNnw0", "Message", "Truth", "Thoughtful, direct, apologetics for real questions."),
];

export function isAppleItem(item: LibraryItem): boolean {
  return !!item.appleEmbed;
}

export function isSpotifyItem(item: LibraryItem): boolean {
  return !!item.spotifyEmbed;
}

// Privacy-friendly embed URL for any video/playlist/Apple/Spotify item.
export function getEmbedUrl(item: LibraryItem): string | null {
  if (item.appleEmbed) return item.appleEmbed;
  if (item.spotifyEmbed) return item.spotifyEmbed;
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
  if (item.search) return `https://www.youtube.com/results?search_query=${encodeURIComponent(item.search)}`;
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

// Convert any music.apple.com playlist/album/song URL into an embeddable one.
export function parseAppleMusic(input: string): string[] {
  const urls: string[] = [];
  const re = /https?:\/\/(?:embed\.)?music\.apple\.com\/[^\s"'<>]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const embed = m[0].replace("://music.apple.com", "://embed.music.apple.com");
    if (!urls.includes(embed)) urls.push(embed);
  }
  return urls;
}

// Build a playable Apple Music item (playlist / album / song).
export function userAppleItem(embedUrl: string): LibraryItem {
  const kind = /\/album\//.test(embedUrl) ? "Album" : /\/song\//.test(embedUrl) ? "Song" : "Playlist";
  const key = embedUrl.split("/").pop() || embedUrl;
  return {
    id: `user-apple-${key}`,
    title: `Apple Music ${kind}`,
    category: "Music",
    author: "Your picks",
    summary: "Your Apple Music, playing right here. Share the card link to send it on.",
    appleEmbed: embedUrl,
    url: embedUrl.replace("://embed.music.apple.com", "://music.apple.com"),
  };
}

// Convert any open.spotify.com playlist/album/track/etc URL into an embeddable one.
export function parseSpotify(input: string): string[] {
  const urls: string[] = [];
  const re = /https?:\/\/open\.spotify\.com\/(?:embed\/)?(playlist|album|track|artist|show|episode)\/[A-Za-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const embed = m[0].replace("open.spotify.com/", "open.spotify.com/embed/").replace("/embed/embed/", "/embed/");
    if (!urls.includes(embed)) urls.push(embed);
  }
  return urls;
}

// Build a playable Spotify item (playlist / album / track / show / episode).
export function userSpotifyItem(embedUrl: string): LibraryItem {
  const type = embedUrl.match(/\/embed\/(playlist|album|track|artist|show|episode)\//)?.[1] ?? "playlist";
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const key = embedUrl.split("/").pop() || embedUrl;
  return {
    id: `user-spotify-${key}`,
    title: `Spotify ${label}`,
    category: "Music",
    author: "Your picks",
    summary: "Your Spotify, playing right here. Share the card link to send it on.",
    spotifyEmbed: embedUrl,
    url: embedUrl.replace("/embed/", "/"),
  };
}
