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
  spotifyAlt?: string; // a real Spotify playlist URL for the "also on Spotify" link (else a search)
  collection?: string; // the category/section this item shows under (set by inCollection)
  verse?: string; // scripture reference — renders a "Read in the Bible" link (e.g. "Romans 1:16-17")
  logo?: string; // brand domain for a real logo on link cards (e.g. "intouch.org"); falls back to a branded tile
};

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
  spotifyAlt?: string,
): LibraryItem => ({
  id,
  title,
  author,
  category: "Music",
  tags: [tag],
  summary,
  featured,
  spotifyAlt,
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
  logo?: string,
): LibraryItem => ({ id, title, author, category, tags: [tag], summary, url, logo });

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
    v("billy-graham-seoul", "Billy Graham in Seoul, South Korea", "Billy Graham · BGEA", "PQDLjd57vdE", "Message", "Gospel", "Billy Graham's 1973 Seoul Crusade is one of the clearest public examples of Gospel-first preaching reaching millions. Start here: Jesus, repentance, faith, and peace with God. Plays right here.", true),
  ]),

  // Music playlists — Apple Music embeds. Add one line here to add a playlist.
  ...inCollection("Playlists", [
    applePl("apple-faith-playlist", "Faith Playlist", "theDJcares", "faith-playlist/pl.u-2aoqXjzsNqgmY7", "Reviewed", "The songs I keep coming back to — TheDJCares-reviewed. Press play and let faith rise.", true, "https://open.spotify.com/playlist/37i9dQZF1DXcb6CQIjdqKy"),
    applePl("apple-todays-christian", "Today's Christian", "theDJcares", "todays-christian/pl.fecfa8a26ea44ad581d4fe501892c8ff", "Worship", "Today's Christian music, hand-picked to encourage.", false, "https://open.spotify.com/playlist/37i9dQZF1DX5SzTPIoCKiv"),
    applePl("apple-christian-rap", "Christian Rap Essentials", "theDJcares", "christian-rap-essentials/pl.981a3c7a4e4641ceae33034bc51bdceb", "Rap", "Faith-filled bars — Christian hip-hop that points to Jesus."),
    applePl("apple-christian-workout", "Christian Workout", "theDJcares", "christian-workout/pl.4f6345e9ab6f4782bd31250b74ec6b23", "Energy", "High-energy worship to move to — eyes up while you push."),
    applePl("apple-country-faith", "Country Faith", "theDJcares", "country-faith/pl.a1f19c594aa846c3898dd98dd99c8910", "Country", "Country music with a faithful heart."),
    applePl("apple-church-hymns", "Church Hymns", "theDJcares", "church-hymns/pl.u-oZyll6RTRo9g6J", "Hymn", "The old hymns that have carried the church for generations."),
  ]),

  ...inCollection("The Gospel", [
    v("adrian-rogers-saving-grace", "The Gospel of His Saving Grace", "Adrian Rogers · Love Worth Finding", "23Iz4golt-I", "Message", "Gospel", "Adrian Rogers preaches the heart of the Gospel — the saving grace of Jesus. Plays right here."),
    link("billy-graham-classics", "Billy Graham Classics", "Billy Graham · BGEA", "https://billygraham.org/classics", "Message", "Gospel", "Timeless crusade messages from Billy Graham — clear, Christ-centered preaching. Watch a full classic.", "billygraham.org"),
    link("peace-with-god", "Peace With God", "BGEA", "https://peacewithgod.net/", "Resource", "Gospel", "A gentle walk through how to have peace with God through Jesus. A good place to start, or to send a friend.", "peacewithgod.net"),
  ]),

  ...inCollection("Hymns & Worship", [
    v("hymn-amazing-grace", "Amazing Grace", "John Newton · Reawaken Hymns", "aDmcdZTEU5E", "Song", "Hymn", "“I once was lost, but now am found.” The great hymn of God's grace — plays right here."),
    v("hymn-how-great-thou-art", "How Great Thou Art", "Stuart K. Hine · Shane & Shane", "bjWZz90hj4I", "Song", "Hymn", "A hymn of awe at God's creation and salvation. “Then sings my soul…” Plays right here."),
    v("hymn-it-is-well", "It Is Well With My Soul", "Horatio Spafford · Reawaken Hymns", "i4Mo9pkmd98", "Song", "Hymn", "Written in deep grief — peace with God even when everything else is shaking."),
    v("hymn-blessed-assurance", "Blessed Assurance", "Fanny Crosby · Reawaken Hymns", "6GJF1ac37lI", "Song", "Hymn", "“Jesus is mine!” A joyful hymn of confidence and hope in Christ."),
    v("hymn-great-is-thy-faithfulness", "Great Is Thy Faithfulness", "Thomas Chisholm · Reawaken Hymns", "lbDNkwcuBus", "Song", "Hymn", "“Morning by morning new mercies I see.” A hymn of God's steady faithfulness."),
    v("song-lord-im-tired", "Lord I'm Tired But Don't Give Up On Me", "In the style of Chris Stapleton & Lauren Daigle · fan-made", "yely732kD3g", "Song", "Worship", "A prayer for the worn-out seasons — tired, but not letting go of God, and He's not letting go of you. Plays right here."),
    v("song-there-was-jesus", "There Was Jesus", "Zach Williams & Dolly Parton", "37wV6D49iEY", "Song", "Worship", "Looking back at the hardest roads and seeing God was there the whole time. Plays right here."),
  ]),

  ...inCollection("Podcasts", [
    spot("ttb-podcast", "Thru the Bible", "J. Vernon McGee", "show/0WmJbQgQpokjpG3mbuW5bS", "Bible", "J. Vernon McGee's verse-by-verse journey through the whole Bible — press play and listen right here."),
    spot("ttb-minute-with-mcgee", "A Minute with McGee", "J. Vernon McGee", "show/3zDZQj0UpJj86JokVMd5OH", "Daily", "Short daily Bible encouragement from Dr. McGee — a minute in the Word, playing right here."),
  ]),

  // Ministry home pages, grouped — one link each (no per-episode buttons).
  ...inCollection("Trusted Ministries", [
    link("min-lwf", "Love Worth Finding — Adrian Rogers", "Adrian Rogers", "https://www.oneplace.com/ministries/love-worth-finding/", "Message", "Ministry", "Adrian Rogers' clear, warm, Bible-first teaching — full sermons and daily broadcasts.", "lwf.org"),
    link("min-intouch", "In Touch — Charles Stanley", "Charles Stanley", "https://www.intouch.org/", "Message", "Ministry", "Charles Stanley's trusted teaching — sermons, articles, and daily devotions.", "intouch.org"),
    link("min-ttb", "Thru the Bible — J. Vernon McGee", "J. Vernon McGee", "https://www.ttb.org/", "Lesson", "Ministry", "The classic verse-by-verse walk through the whole Bible, Genesis to Revelation.", "ttb.org"),
    link("min-turningpoint", "Turning Point — David Jeremiah", "David Jeremiah", "https://davidjeremiah.blog/", "Message", "Ministry", "David Jeremiah's teaching on the Bible's big story, with Christ at the center.", "davidjeremiah.org"),
    link("min-allen-jackson", "Allen Jackson Ministries", "Pastor Allen Jackson", "https://allenjackson.com/", "Message", "Ministry", "Pastor Allen Jackson (not the country singer) — practical, Bible-first teaching, broadcasts, and a reading plan.", "allenjackson.com"),
    link("min-dobson", "Dr. James Dobson Family Institute", "Dr. James Dobson", "https://www.drjamesdobson.org/", "Resource", "Ministry", "Trusted, faith-based help for marriage, parenting, and family life — broadcasts and the Dr. Dobson Minute.", "drjamesdobson.org"),
    link("min-odb", "Our Daily Bread", "Our Daily Bread Ministries", "https://www.odbm.org/en/devotionals", "Resource", "Ministry", "One of the most-loved daily devotionals — a verse, a short reflection, and a prayer.", "odb.org"),
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
  if (item.playlistId) return `https://www.youtube-nocookie.com/embed/videoseries?list=${item.playlistId}&cc_load_policy=1&cc_lang_pref=en`;
  if (!item.isVideo) return null;
  if (item.videoProvider === "youtube" && item.videoId) {
    return `https://www.youtube-nocookie.com/embed/${item.videoId}?cc_load_policy=1&cc_lang_pref=en`;
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
