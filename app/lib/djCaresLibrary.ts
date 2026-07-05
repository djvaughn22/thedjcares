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
  collection?: string; // the category/section this item shows under (set by inCollection)
  verse?: string; // scripture reference — renders a "Read in the Bible" link (e.g. "Romans 1:16-17")
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

// Curated Apple Music playlist/album (embeds and plays the whole thing in-app).
// `path` is everything after .../playlist/ — e.g. "todays-christian/pl.fecfa8a26ea44ad581d4fe501892c8ff"
const applePl = (
  id: string,
  title: string,
  author: string,
  path: string,
  tag: string,
  summary: string,
  featured = false,
): LibraryItem => ({
  id,
  title,
  author,
  category: "Music",
  tags: [tag],
  summary,
  featured,
  appleEmbed: `https://embed.music.apple.com/us/playlist/${path}`,
  url: `https://music.apple.com/us/playlist/${path}`,
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

// Spotify playlist/album — paste the open.spotify.com/... path (e.g. "playlist/37i9dQ...").
const spot = (
  id: string,
  title: string,
  author: string,
  path: string,
  tag: string,
  summary: string,
  featured = false,
): LibraryItem => ({
  id,
  title,
  author,
  category: "Music",
  tags: [tag],
  summary,
  featured,
  spotifyEmbed: `https://open.spotify.com/embed/${path}`,
  url: `https://open.spotify.com/${path}`,
});

// External link card (podcasts, resources) — opens the source in a new tab.
const link = (
  id: string,
  title: string,
  author: string,
  url: string,
  category: LibraryCategory,
  tag: string,
  summary: string,
): LibraryItem => ({ id, title, author, category, tags: [tag], summary, url });

// Tag every item in a group with its collection (the category/section it shows under).
const inCollection = (collection: string, items: LibraryItem[]): LibraryItem[] =>
  items.map(i => ({ ...i, collection }));

// ============================================================================
// THE LIBRARY — grouped by collection (category). To add content, drop ONE line
// into the right group below, or add a new inCollection("Name", [ ... ]) block.
// Helpers: v = YouTube video · applePl / spot = playlists · link = podcast/resource
// · s = YouTube search fallback.  All items are real, DJ-curated. Video IDs are
// verified live via YouTube oEmbed — never ship an unverified id.
// ============================================================================
export const DJ_CARES_LIBRARY: LibraryItem[] = [
  ...inCollection("Featured", [
    v("billy-graham-seoul", "Billy Graham in Seoul, South Korea", "Billy Graham · BGEA", "PQDLjd57vdE", "Message", "Gospel", "Billy Graham's 1973 Seoul Crusade is one of the clearest public examples of Gospel-first preaching reaching millions. Start here: Jesus, repentance, faith, and peace with God.", true),
  ]),

  ...inCollection("The Gospel", [
    link("billy-graham-classics", "Billy Graham Classics", "Billy Graham · BGEA", "https://billygraham.org/classics", "Message", "Gospel", "Timeless crusade messages from Billy Graham — clear, Christ-centered preaching. Watch a full classic."),
    link("peace-with-god", "Peace With God", "BGEA", "https://peacewithgod.net/", "Resource", "Gospel", "A gentle walk through how to have peace with God through Jesus. A good place to start, or to send a friend."),
  ]),

  ...inCollection("Bible Teaching", [
    link("lwf-home", "Love Worth Finding", "Adrian Rogers · LWF", "https://www.lwf.org/", "Message", "Classic", "Adrian Rogers' clear, warm, Bible-first teaching — sermons, series, and daily study, all in one place."),
    link("lwf-bottom-falls-out", "What to Do When the Bottom Falls Out", "Adrian Rogers · LWF", "https://www.lwf.org/sermons/video/what-to-do-when-the-bottom-falls-out-2140", "Message", "Classic", "Steady, hope-filled teaching for the hardest seasons — where to stand when everything shakes."),
    link("lwf-biblical-faith", "Biblical Faith: What It Is and How to Have It", "Adrian Rogers · LWF", "https://www.lwf.org/sermons/video/biblical-faith-what-it-is-and-how-to-have-it-1749", "Message", "Bible", "What faith actually is, and how it grows — grounded in Scripture."),
    link("lwf-prayer", "Prayer", "Adrian Rogers · LWF", "https://www.lwf.org/sermons/video/prayer-2064", "Message", "Prayer", "A plain, encouraging teaching on prayer and talking honestly with God."),
    link("lwf-forever-family", "God's Forever Family", "Adrian Rogers · LWF", "https://www.lwf.org/sermons/audio/gods-forever-family-1497", "Message", "Gospel", "On belonging to God's family forever through Christ."),
    link("lwf-edge-of-eternity", "Living on the Edge of Eternity", "Adrian Rogers · LWF", "https://www.lwf.org/sermon-outlines/living-on-the-edge-of-eternity-outline-and-transcript", "Lesson", "Revelation", "Outline and transcript — living today in the light of eternity."),
    link("intouch-home", "In Touch Ministries", "Charles Stanley · In Touch", "https://www.intouch.org/", "Message", "Classic", "Charles Stanley's trusted teaching — sermons, articles, and daily encouragement."),
    link("ttb-home", "Thru the Bible", "J. Vernon McGee", "https://www.ttb.org/", "Lesson", "Genesis to Revelation", "J. Vernon McGee's classic verse-by-verse walk through the whole Bible, Genesis to Revelation. Warm, simple, faithful."),
    link("dj-second-coming", "Christ's Second Coming in God's Story of Redemption", "David Jeremiah · Turning Point", "https://davidjeremiah.blog/christs-second-coming-in-gods-story-of-redemption/", "Message", "Revelation", "Where the whole Bible is heading — Christ at the center of God's redemption story."),
    link("dj-basics-of-bible", "Understand the Basics of the Bible", "David Jeremiah · Turning Point", "https://davidjeremiah.blog/understand-the-basics-of-the-bible/", "Lesson", "Genesis to Revelation", "A clear overview of the Bible's big story from Genesis to Revelation."),
    link("dj-escape-coming-night", "Intro from Escape the Coming Night", "David Jeremiah · Turning Point", "https://davidjeremiah.blog/intro-from-escape-the-coming-night/", "Message", "Revelation", "An accessible introduction to Revelation, centered on Christ as the Alpha and Omega."),
  ]),

  ...inCollection("Prayer & Devotional", [
    link("intouch-daily", "In Touch Daily Devotions", "Charles Stanley · In Touch", "https://www.intouch.org/read/daily-devotions", "Resource", "Daily", "A short, steady daily devotional to start the day in Scripture."),
    link("our-daily-bread", "Our Daily Bread", "Our Daily Bread Ministries", "https://www.odbm.org/en/devotionals", "Resource", "Daily", "One of the most-loved daily devotionals — a verse, a short reflection, and a prayer."),
    { id: "hallesby-prayer", title: "Classic Prayer Education: O. Hallesby's Prayer", author: "O. Hallesby", category: "Book", tags: ["Prayer"], summary: "A classic prayer resource about helplessness, faith, dependence, and talking honestly with God. No random copyrighted upload is linked here — find it through a library or trusted bookseller." },
  ]),

  ...inCollection("Family & Home", [
    link("allen-jackson-home", "Allen Jackson Ministries", "Pastor Allen Jackson", "https://allenjackson.com/", "Message", "Family", "Pastor Allen Jackson (not the country singer) — practical, Bible-first teaching for everyday faith and family."),
    link("allen-jackson-tv", "Recent TV Broadcasts", "Pastor Allen Jackson", "https://allenjackson.com/watch/recent-tv-broadcasts/", "Message", "Family", "Recent broadcasts — TheDJCares-reviewed encouragement, not a blanket endorsement of every topical episode."),
    link("allen-jackson-bible-reading", "Bible Reading Plan", "Pastor Allen Jackson", "https://allenjackson.com/bible-reading/", "Resource", "Bible", "A simple Bible-reading plan to keep you in the Word."),
    link("dobson-home", "Dr. James Dobson Family Institute", "Dr. James Dobson", "https://www.drjamesdobson.org/", "Resource", "Family", "Trusted, faith-based help for marriage, parenting, and family life."),
    link("dobson-broadcasts", "Family Talk Broadcasts", "Dr. James Dobson", "https://www.drjamesdobson.org/category/broadcasts/", "Resource", "Family", "Encouraging broadcasts on faith, marriage, and raising kids."),
    link("dobson-marriage-parenting", "Marriage & Parenting", "Dr. James Dobson", "https://www.drjamesdobson.org/category/marriage-parenting/", "Resource", "Family", "Practical, biblical help for marriage and parenting."),
    link("dobson-family-legacy", "Building a Family Legacy", "Dr. James Dobson", "https://www.drjamesdobson.org/broadcasts/building-a-family-legacy-part-1/", "Resource", "Family", "On leaving a legacy of faith for your children and grandchildren."),
    link("dobson-minute", "The Dr. Dobson Minute", "Dr. James Dobson", "https://www.drjamesdobson.org/category/dobson-minute/", "Resource", "Family", "Quick, encouraging, one-minute family wisdom."),
  ]),

  ...inCollection("Hymns & Worship", [
    applePl("apple-faith-playlist", "Faith Playlist", "theDJcares", "faith-playlist/pl.u-2aoqXjzsNqgmY7", "Reviewed", "TheDJCares-reviewed music encouragement — the songs I keep coming back to. Press play and let faith rise.", true),
    applePl("apple-church-hymns", "Church Hymns", "theDJcares", "church-hymns/pl.u-oZyll6RTRo9g6J", "Hymn", "TheDJCares-reviewed music encouragement — the old hymns that have carried the church for generations.", true),
    { id: "hymn-amazing-grace", title: "Amazing Grace", author: "John Newton (1779)", category: "Song", tags: ["Hymn"], summary: "“I once was lost, but now am found.” The great hymn of God's grace — worth singing slowly." },
    { id: "hymn-how-great-thou-art", title: "How Great Thou Art", author: "Stuart K. Hine", category: "Song", tags: ["Hymn"], summary: "A hymn of awe at God's creation and salvation. “Then sings my soul…”" },
    { id: "hymn-it-is-well", title: "It Is Well With My Soul", author: "Horatio Spafford (1873)", category: "Song", tags: ["Hymn"], summary: "Written in deep grief — peace with God even when everything else is shaking." },
    { id: "hymn-blessed-assurance", title: "Blessed Assurance", author: "Fanny Crosby (1873)", category: "Song", tags: ["Hymn"], summary: "“Jesus is mine!” A joyful hymn of confidence and hope in Christ." },
    { id: "hymn-great-is-thy-faithfulness", title: "Great Is Thy Faithfulness", author: "Thomas Chisholm (1923)", category: "Song", tags: ["Hymn"], summary: "“Morning by morning new mercies I see.” A hymn of God's steady faithfulness." },
  ]),
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
