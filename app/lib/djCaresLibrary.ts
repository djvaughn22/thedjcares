// The DJ Cares — the approved media library. Single source of truth.
//
// Every playable thing on the site lives here: music, music videos, podcasts,
// and sermons, plus the ministry registry and approved churches. The player
// and every shuffle only ever select from this file — nothing is pulled from
// YouTube's recommendation system.
//
// HOUSE RULES
// - Official channels only (artist, label, ministry, church, or authorized
//   publisher). No re-uploads, no compilation channels.
// - Verify every YouTube id via oEmbed before shipping (200 + the official
//   channel as author), then set `verified` to that date:
//     curl -s "https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DID&format=json"
// - To bench an item without deleting it, set `active: false`.
// - Gospel first, low controversy, family-safe. If in doubt, leave it out.

export type MediaType = "music" | "podcast" | "sermon" | "playlist";

export type Vibe =
  | "Gospel"
  | "Worship"
  | "Hymns"
  | "Joy"
  | "Hope"
  | "Peace"
  | "Faith"
  | "Prayer"
  | "Family";

export const VIBES: Vibe[] = [
  "Gospel",
  "Worship",
  "Hymns",
  "Joy",
  "Hope",
  "Peace",
  "Faith",
  "Prayer",
  "Family",
];

export type MinistryKey =
  | "bgea"
  | "lwf"
  | "turning-point"
  | "allen-jackson"
  | "pastor-rick"
  | "family-talk"
  | "in-touch"
  | "ttb"
  | "odb";

export type Ministry = {
  key: MinistryKey;
  name: string; // current official ministry name
  speaker: string;
  purpose: string; // one plain line — what they're known for
  officialUrl: string;
  youtubeUrl?: string; // the official channel
  verified: string; // date the name/URLs were last checked
};

export type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  author: string; // artist, speaker, host, or show
  ministry?: MinistryKey;
  summary?: string; // DJ's short note — why it's here
  url: string; // canonical official source
  videoId?: string; // YouTube (oEmbed-verified)
  musicVideo?: boolean; // music item that's a proper official music video
  appleEmbed?: string; // embed.music.apple.com URL
  spotifyEmbed?: string; // open.spotify.com/embed URL
  spotifyAlt?: string; // Spotify twin for Apple playlists
  vibes: Vibe[];
  duration?: string; // only when reliably known
  featured?: boolean;
  active?: boolean; // default true; false = benched, never selected
  verified: string; // date the source was last verified
  note?: string; // maintainer-only context
};

// ---------------------------------------------------------------------------
// Trusted ministries — official current names, sites, and channels.
// ---------------------------------------------------------------------------
export const MINISTRIES: Ministry[] = [
  {
    key: "bgea",
    name: "Billy Graham Evangelistic Association",
    speaker: "Billy Graham",
    purpose: "Classic crusade messages — the Gospel, plainly preached.",
    officialUrl: "https://billygraham.org/",
    youtubeUrl: "https://www.youtube.com/@BillyGraham",
    verified: "2026-07-18",
  },
  {
    key: "lwf",
    name: "Love Worth Finding",
    speaker: "Adrian Rogers",
    purpose: "Warm, Bible-first preaching with Christ at the center.",
    officialUrl: "https://www.lwf.org/",
    youtubeUrl: "https://www.youtube.com/channel/UCXa0JD4PKd9E0tIbUu4n8Qw",
    verified: "2026-07-18",
  },
  {
    key: "turning-point",
    name: "Turning Point",
    speaker: "David Jeremiah",
    purpose: "Clear Bible teaching on everyday faith, hope, and peace.",
    officialUrl: "https://www.davidjeremiah.org/",
    youtubeUrl: "https://www.youtube.com/@drdavidjeremiah",
    verified: "2026-07-18",
  },
  {
    key: "allen-jackson",
    name: "Allen Jackson Ministries",
    speaker: "Allen Jackson",
    purpose: "Practical, Scripture-rooted teaching for daily faithfulness.",
    officialUrl: "https://allenjackson.com/",
    youtubeUrl: "https://www.youtube.com/@AllenJacksonMinistries",
    verified: "2026-07-18",
    // Full sermons are published on his church's official channel,
    // World Outreach Church (UCyLCM2cH1J2YIuyQsIlIoug).
  },
  {
    key: "pastor-rick",
    name: "Pastor Rick (Daily Hope)",
    speaker: "Rick Warren",
    purpose: "Hope-filled teaching on living out what the Bible says.",
    officialUrl: "https://pastorrick.com/",
    youtubeUrl: "https://www.youtube.com/@DailyHopeRickWarren",
    verified: "2026-07-18",
  },
  {
    key: "family-talk",
    name: "Dr. James Dobson Family Institute",
    speaker: "James Dobson",
    purpose: "Faith-based help for marriage, parenting, and family life.",
    officialUrl: "https://www.drjamesdobson.org/",
    youtubeUrl: "https://www.youtube.com/channel/UCNgv7RLb0YMyIjB2KiXuGfA",
    verified: "2026-07-18",
  },
  {
    key: "in-touch",
    name: "In Touch Ministries",
    speaker: "Charles Stanley",
    purpose: "Trusted teaching — sermons, devotions, and daily broadcasts.",
    officialUrl: "https://www.intouch.org/",
    verified: "2026-07-18",
  },
  {
    key: "ttb",
    name: "Thru the Bible",
    speaker: "J. Vernon McGee",
    purpose: "The classic verse-by-verse walk through the whole Bible.",
    officialUrl: "https://www.ttb.org/",
    verified: "2026-07-18",
  },
  {
    key: "odb",
    name: "Our Daily Bread Ministries",
    speaker: "Our Daily Bread",
    purpose: "One of the most-loved daily devotionals — a verse, a reflection, a prayer.",
    officialUrl: "https://www.odbm.org/en/devotionals",
    verified: "2026-07-18",
  },
];

export function ministryByKey(key: MinistryKey | undefined): Ministry | undefined {
  return MINISTRIES.find((m) => m.key === key);
}

// --- one-line item helpers -------------------------------------------------

const yt = (
  id: string,
  type: MediaType,
  title: string,
  author: string,
  videoId: string,
  vibes: Vibe[],
  extra: Partial<MediaItem> = {},
): MediaItem => ({
  id,
  type,
  title,
  author,
  videoId,
  vibes,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  verified: "2026-07-18",
  ...extra,
});

const song = (id: string, title: string, author: string, videoId: string, vibes: Vibe[], extra: Partial<MediaItem> = {}) =>
  yt(id, "music", title, author, videoId, vibes, extra);

const sermon = (
  id: string,
  title: string,
  author: string,
  ministry: MinistryKey,
  videoId: string,
  vibes: Vibe[],
  extra: Partial<MediaItem> = {},
) => yt(id, "sermon", title, author, videoId, vibes, { ministry, ...extra });

const applePl = (id: string, title: string, path: string, vibes: Vibe[], extra: Partial<MediaItem> = {}): MediaItem => ({
  id,
  type: "playlist",
  title,
  author: "The DJ Cares",
  vibes,
  appleEmbed: `https://embed.music.apple.com/us/playlist/${path}`,
  url: `https://music.apple.com/us/playlist/${path}`,
  verified: "2026-07-18",
  ...extra,
});

// ---------------------------------------------------------------------------
// MUSIC — official artist/label uploads only. `musicVideo: true` marks a
// proper official music video (those also show under Music Videos).
// ---------------------------------------------------------------------------
const MUSIC: MediaItem[] = [
  song("song-way-maker", "Way Maker", "Leeland", "iJCV_2H9xD0", ["Hope", "Worship"], { musicVideo: true, featured: true, summary: "Even when you don't see it, He's working. The first record on the deck." }),
  song("song-this-is-amazing-grace", "This Is Amazing Grace", "Phil Wickham", "XFRjr_x-yxU", ["Worship", "Gospel"], { musicVideo: true, duration: "4:59", summary: "The wonder of grace, sung loud." }),
  song("song-living-hope", "Living Hope", "Phil Wickham", "u-1fwZtKJSM", ["Hope", "Gospel"], { musicVideo: true, summary: "“Hallelujah, praise the One who set me free.”" }),
  song("song-battle-belongs", "Battle Belongs", "Phil Wickham", "qtvQNzPHn-w", ["Faith", "Hope"], { musicVideo: true, summary: "When it's too heavy — the fight was never yours alone." }),
  song("song-chains-are-gone", "Amazing Grace (My Chains Are Gone)", "Chris Tomlin", "Y-4NFvI5U9w", ["Worship", "Gospel"], { musicVideo: true, summary: "The old hymn with a new chorus of freedom." }),
  song("song-we-believe", "We Believe", "Newsboys", "WjZ01FcK0yk", ["Faith", "Worship"], { musicVideo: true, summary: "A creed you can sing." }),
  song("song-i-can-only-imagine", "I Can Only Imagine", "MercyMe", "N_lrrq_opng", ["Hope", "Worship"], { musicVideo: true, summary: "The song that made a generation look up." }),
  song("song-rise-up-lazarus", "Rise Up (Lazarus)", "CAIN", "8RIZlNYl4ok", ["Hope", "Joy"], { musicVideo: true, summary: "Come out of that grave — a resurrection anthem." }),
  song("song-even-if", "Even If", "MercyMe", "B6fA35Ved-Y", ["Faith", "Peace"], { summary: "Hope that holds even when the healing doesn't come." }),
  song("song-praise-you-in-this-storm", "Praise You in This Storm", "Casting Crowns", "0YUGwUgBvTU", ["Faith", "Peace"], { summary: "Worship that doesn't wait for the storm to pass." }),
  song("song-my-jesus", "My Jesus", "Anne Wilson", "FW5o2uBeMWQ", ["Gospel", "Joy"], { musicVideo: true, summary: "Let me tell you about my Jesus." }),
  song("song-just-be-held", "Just Be Held", "Casting Crowns", "tIZitK6_IMQ", ["Peace", "Faith"], { summary: "Stop holding on — and just be held." }),
  song("song-chain-breaker", "Chain Breaker", "Zach Williams", "cd_xxmXdQz4", ["Hope", "Gospel"], { musicVideo: true, summary: "If you've got chains, He's a chain breaker." }),
  song("song-fear-is-a-liar", "Fear Is a Liar", "Zach Williams", "1srs1YoTVzs", ["Peace", "Faith"], { musicVideo: true, summary: "Calling fear what it is." }),
  song("song-who-am-i", "Who Am I", "Casting Crowns", "3rT8Re1EIQc", ["Gospel", "Worship"], { duration: "5:34", summary: "Not because of who I am — because of what You've done." }),
  song("song-rescue-story", "Rescue Story", "Zach Williams", "Q3aP5iuJITg", ["Gospel", "Hope"], { musicVideo: true, summary: "You were the rescue story — live from Red Rocks." }),
  song("song-god-who-stays", "The God Who Stays", "Matthew West", "QPwd_TQpsHY", ["Peace", "Hope"], { musicVideo: true, summary: "He's the God who stays, even when you run." }),
  song("song-you-say", "You Say", "Lauren Daigle", "sIaT8Jl2zpI", ["Peace", "Faith"], { musicVideo: true, summary: "When the voices argue — believe what He says." }),
  song("song-christ-be-all-around-me", "Christ Be All Around Me", "All Sons & Daughters", "cmge-ycIkoo", ["Peace", "Prayer"], { summary: "A quiet prayer to carry through the day." }),
  song("song-scars-in-heaven", "Scars in Heaven", "Casting Crowns", "qCdevloDE6E", ["Hope", "Family"], { musicVideo: true, summary: "For anyone missing someone — the only scars in heaven are His." }),
  song("song-holy-water", "Holy Water", "We The Kingdom", "7KLQ2AXQmtA", ["Worship", "Joy"], { musicVideo: true, summary: "Grace like holy water — live and joyful." }),
  song("song-good-day", "GOOD DAY", "Forrest Frank", "eO7-9WzLDZo", ["Joy"], { musicVideo: true, summary: "It's gonna be a good day. Turn it up." }),
  song("song-joy", "joy.", "for KING & COUNTRY", "lA7n7TwPDmw", ["Joy"], { musicVideo: true, summary: "Choosing joy on purpose." }),
  song("song-counting-my-blessings", "Counting My Blessings", "Seph Schlueter", "aZjWYgq9QfM", ["Joy", "Worship"], { summary: "A gratitude reset in one song." }),
  song("song-there-was-jesus", "There Was Jesus", "Zach Williams & Dolly Parton", "37wV6D49iEY", ["Hope", "Gospel"], { musicVideo: true, summary: "Looking back at the hardest roads and seeing He was there." }),
  // Hymns — official Reawaken Hymns (Nathan Drake) and Shane & Shane uploads.
  song("hymn-amazing-grace", "Amazing Grace", "Reawaken Hymns", "aDmcdZTEU5E", ["Hymns", "Gospel"], { summary: "“I once was lost, but now am found.”" }),
  song("hymn-how-great-thou-art", "How Great Thou Art", "Shane & Shane", "EueRjHaGbS4", ["Hymns", "Worship"], { musicVideo: true, duration: "5:07", summary: "“Then sings my soul…”" }),
  song("hymn-it-is-well", "It Is Well With My Soul", "Reawaken Hymns", "i4Mo9pkmd98", ["Hymns", "Peace"], { summary: "Written in deep grief — peace that holds anyway." }),
  song("hymn-blessed-assurance", "Blessed Assurance", "Reawaken Hymns", "6GJF1ac37lI", ["Hymns", "Joy"], { summary: "“Jesus is mine!” Confidence you can sing." }),
  song("hymn-great-is-thy-faithfulness", "Great Is Thy Faithfulness", "Reawaken Hymns", "lbDNkwcuBus", ["Hymns", "Hope"], { summary: "“Morning by morning new mercies I see.”" }),
];

// ---------------------------------------------------------------------------
// PLAYLISTS — DJ-curated Apple Music playlists (with Spotify twins where set).
// ---------------------------------------------------------------------------
const PLAYLISTS: MediaItem[] = [
  applePl("apple-faith-playlist", "Faith Playlist", "faith-playlist/pl.u-2aoqXjzsNqgmY7", ["Faith", "Worship"], { featured: true, spotifyAlt: "https://open.spotify.com/playlist/37i9dQZF1DXcb6CQIjdqKy", summary: "The songs I keep coming back to. Press play and let faith rise." }),
  applePl("apple-todays-christian", "Today's Christian", "todays-christian/pl.fecfa8a26ea44ad581d4fe501892c8ff", ["Worship"], { spotifyAlt: "https://open.spotify.com/playlist/37i9dQZF1DX5SzTPIoCKiv", summary: "Today's Christian music, hand-picked to encourage." }),
  applePl("apple-christian-rap", "Christian Rap Essentials", "christian-rap-essentials/pl.981a3c7a4e4641ceae33034bc51bdceb", ["Joy"], { summary: "Faith-filled bars that point to Jesus." }),
  applePl("apple-christian-workout", "Christian Workout", "christian-workout/pl.4f6345e9ab6f4782bd31250b74ec6b23", ["Joy"], { summary: "High-energy worship to move to." }),
  applePl("apple-country-faith", "Country Faith", "country-faith/pl.a1f19c594aa846c3898dd98dd99c8910", ["Hope"], { summary: "Country music with a faithful heart." }),
  applePl("apple-church-hymns", "Church Hymns", "church-hymns/pl.u-oZyll6RTRo9g6J", ["Hymns"], { summary: "The old hymns that have carried the church for generations." }),
];

// ---------------------------------------------------------------------------
// PODCASTS — official publisher embeds, or a clean card with the official
// listening destination. Never mixed into the sermon list.
// ---------------------------------------------------------------------------
const PODCASTS: MediaItem[] = [
  {
    id: "pod-thru-the-bible",
    type: "podcast",
    title: "Thru the Bible",
    author: "J. Vernon McGee",
    ministry: "ttb",
    vibes: ["Faith"],
    summary: "The verse-by-verse journey through the whole Bible — plays right here.",
    spotifyEmbed: "https://open.spotify.com/embed/show/0WmJbQgQpokjpG3mbuW5bS",
    url: "https://open.spotify.com/show/0WmJbQgQpokjpG3mbuW5bS",
    featured: true,
    verified: "2026-07-18",
  },
  {
    id: "pod-minute-with-mcgee",
    type: "podcast",
    title: "A Minute with McGee",
    author: "J. Vernon McGee",
    ministry: "ttb",
    vibes: ["Faith", "Hope"],
    summary: "Short daily Bible encouragement — a minute in the Word.",
    spotifyEmbed: "https://open.spotify.com/embed/show/3zDZQj0UpJj86JokVMd5OH",
    url: "https://open.spotify.com/show/3zDZQj0UpJj86JokVMd5OH",
    verified: "2026-07-18",
  },
  {
    id: "pod-love-worth-finding",
    type: "podcast",
    title: "Love Worth Finding Daily Broadcast",
    author: "Adrian Rogers",
    ministry: "lwf",
    vibes: ["Gospel", "Faith"],
    summary: "Adrian Rogers' daily program — full messages at the official home.",
    url: "https://www.oneplace.com/ministries/love-worth-finding/",
    verified: "2026-07-18",
  },
  {
    id: "pod-in-touch",
    type: "podcast",
    title: "In Touch with Dr. Charles Stanley",
    author: "Charles Stanley",
    ministry: "in-touch",
    vibes: ["Faith", "Peace"],
    summary: "Daily teaching and devotions from In Touch Ministries.",
    url: "https://www.intouch.org/",
    verified: "2026-07-18",
  },
  {
    id: "pod-family-talk",
    type: "podcast",
    title: "Family Talk",
    author: "James Dobson",
    ministry: "family-talk",
    vibes: ["Family"],
    summary: "Daily broadcasts on marriage, parenting, and family faith.",
    url: "https://www.drjamesdobson.org/",
    verified: "2026-07-18",
  },
];

// ---------------------------------------------------------------------------
// SERMONS — approved ministers only, official channels only.
// ---------------------------------------------------------------------------
const SERMONS: MediaItem[] = [
  // Billy Graham — BGEA official channel.
  sermon("bg-seoul-1973", "Billy Graham in Seoul, South Korea", "Billy Graham", "bgea", "PQDLjd57vdE", ["Gospel"], { featured: true, summary: "The 1973 Seoul Crusade — the Gospel, plainly preached, reaching millions." }),
  sermon("bg-christ-is-our-hope", "Christ Is Our Hope", "Billy Graham", "bgea", "9nQ6_iDQcpQ", ["Hope", "Gospel"], { duration: "27:32", summary: "A classic crusade message on the hope we have in Jesus." }),
  sermon("bg-yankee-stadium-1957", "1957 New York Crusade at Yankee Stadium", "Billy Graham", "bgea", "1aZoqIwHsdM", ["Gospel"], { duration: "50:33", summary: "One of the most famous nights in crusade history." }),
  sermon("bg-almost-persuaded", "Almost Persuaded", "Billy Graham", "bgea", "Tq2FlxfHHIk", ["Gospel", "Faith"], { duration: "38:11", summary: "Close isn't the same as decided." }),

  // Adrian Rogers — Love Worth Finding official channel.
  sermon("ar-saving-grace", "The Gospel of His Saving Grace", "Adrian Rogers", "lwf", "23Iz4golt-I", ["Gospel"], { summary: "The heart of the Gospel — the saving grace of Jesus." }),
  sermon("ar-when-you-dont-understand", "When You Don't Understand", "Adrian Rogers", "lwf", "wZYrJHIFNLA", ["Faith", "Peace"], { summary: "Trusting God when life doesn't add up." }),
  sermon("ar-pray-with-confidence", "Pray with Confidence", "Adrian Rogers", "lwf", "R1AtKHqwvTk", ["Prayer"], { summary: "Praying like God actually hears — because He does." }),
  sermon("ar-you-must-make-a-decision", "You Must Make a Decision", "Adrian Rogers", "lwf", "xhl2SUO3pgE", ["Gospel", "Faith"], { summary: "The one question nobody can answer for you." }),

  // David Jeremiah — Turning Point official channel.
  sermon("dj-cure-for-worry", "Cure for Worry: 5 Biblical Truths to Overcome Anxiety", "David Jeremiah", "turning-point", "WwLlpWsiWUA", ["Peace"], { duration: "23:56", summary: "What the Bible actually says to an anxious heart." }),
  sermon("dj-greatest-promise", "The Greatest Promise in the Christian Bible", "David Jeremiah", "turning-point", "n0O5bYdCUhE", ["Hope", "Gospel"], { duration: "28:30", summary: "The promise everything else stands on." }),
  sermon("dj-knowing-a-powerful-god", "Knowing a Powerful God", "David Jeremiah", "turning-point", "b8fTTZHiWW0", ["Faith"], { duration: "23:43", summary: "The God you pray to is not small." }),
  sermon("dj-slaying-giant-of-worry", "Slaying the Giant of Worry", "David Jeremiah", "turning-point", "kLSH5zlamBg", ["Peace", "Faith"], { duration: "39:58", summary: "How to stop overthinking and trust God daily." }),

  // Allen Jackson — full sermons on World Outreach Church's official channel.
  sermon("aj-gods-plan", "God's Plan, God's Promises & God's People", "Allen Jackson", "allen-jackson", "qNTwnZBd6yM", ["Faith", "Hope"], { duration: "46:38", summary: "God has a plan, and His promises hold." }),
  sermon("aj-plans-break-out", "When God's Plans Break Out", "Allen Jackson", "allen-jackson", "nuBtt9zHv6U", ["Hope"], { duration: "57:02", summary: "What happens when God moves ahead of you." }),
  sermon("aj-wonderful-promises", "Such Wonderful Promises", "Allen Jackson", "allen-jackson", "kvgveg-eNDs", ["Hope", "Faith"], { duration: "48:07", summary: "The promises of God, taken personally." }),
  sermon("aj-heart-for-god", "A Heart for God", "Allen Jackson", "allen-jackson", "c7InSsMnV2Y", ["Faith", "Prayer"], { duration: "49:49", summary: "What God looks for first." }),

  // Rick Warren — Pastor Rick (Daily Hope) official channel.
  sermon("rw-hope-is-a-person", "Why Hope Is a Person, Not a Feeling", "Rick Warren", "pastor-rick", "2J0ktFz_g6w", ["Hope", "Gospel"], { duration: "50:39", summary: "Hope has a name." }),
  sermon("rw-resurrection-hope", "How the Resurrection Gives Us Hope", "Rick Warren", "pastor-rick", "hnr3rm6s4vw", ["Hope", "Gospel"], { duration: "27:12", summary: "Because He lives, everything changes." }),
  sermon("rw-noahs-story", "Noah's Story and the Hope God Puts in Your Storm", "Rick Warren", "pastor-rick", "t59VZIWhgew", ["Hope", "Faith"], { duration: "47:59", summary: "Storms end. God's promises don't." }),
  sermon("rw-god-heard-your-prayer", "God Heard Your Prayer, But Here's Why You're Still Waiting", "Rick Warren", "pastor-rick", "Ai6ikOhU4ls", ["Prayer", "Peace"], { duration: "53:35", summary: "Waiting isn't the same as unheard." }),

  // James Dobson — Family Talk official channel.
  sermon("jd-wake-up-your-faith", "Wake Up Your Faith, Part One", "James Dobson", "family-talk", "brXxO1yaTB0", ["Faith", "Family"], { summary: "Faith that's awake at home first." }),
  sermon("jd-treasure-in-heaven", "Laying Up Treasure in Heaven, Part One", "James Dobson", "family-talk", "n1CuctOd4OY", ["Faith", "Family"], { summary: "What lasts longer than everything you own." }),
  sermon("jd-moral-character", "Building Moral Character in Your Children", "James Dobson", "family-talk", "7HJDSWbx4XI", ["Family"], { summary: "Practical help for raising kids of character." }),
  sermon("jd-firm-objectives", "Firm Objectives in Parenting", "James Dobson", "family-talk", "1bCRQVka6VM", ["Family"], { summary: "Parenting on purpose, not on autopilot." }),
];

export const LIBRARY: MediaItem[] = [...MUSIC, ...PLAYLISTS, ...PODCASTS, ...SERMONS];

// ---------------------------------------------------------------------------
// Approved churches — every entry here was manually reviewed first.
// Public submissions NEVER publish directly; they arrive by email, get
// checked (official channel, Gospel-first, real congregation), then one of
// these records is added by hand.
// ---------------------------------------------------------------------------
export type ApprovedChurch = {
  id: string;
  name: string;
  city: string;
  region: string; // state / province
  country: string;
  websiteUrl: string;
  youtubeUrl: string; // official channel
  liveUrl?: string; // official live page (…/live) if they stream
  serviceTimes?: string; // plain text, e.g. "Sundays 9:00 & 11:00 AM"
  timezone?: string; // e.g. "America/Chicago"
  approved: true;
  verified: string; // date last checked
};

export const APPROVED_CHURCHES: ApprovedChurch[] = [
  // None yet — the first reviewed submissions will land here.
];

// --- selection + helpers ---------------------------------------------------

export function activeItems(items: MediaItem[] = LIBRARY): MediaItem[] {
  return items.filter((i) => i.active !== false);
}

export function itemsOfType(type: MediaType, items: MediaItem[] = LIBRARY): MediaItem[] {
  return activeItems(items).filter((i) => i.type === type);
}

export function musicVideos(items: MediaItem[] = LIBRARY): MediaItem[] {
  return itemsOfType("music", items).filter((i) => i.musicVideo);
}

// Can the Now Spinning player play it directly (vs. link out)?
export function isPlayable(item: MediaItem): boolean {
  return Boolean(item.videoId || item.spotifyEmbed || item.appleEmbed);
}

export function artworkUrl(item: MediaItem): string | null {
  if (item.videoId) return `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
  return null;
}

// Privacy-friendly embed URL (non-API fallback and Apple/Spotify players).
export function getEmbedUrl(item: MediaItem): string | null {
  if (item.appleEmbed) return item.appleEmbed;
  if (item.spotifyEmbed) return item.spotifyEmbed;
  if (item.videoId) {
    return `https://www.youtube-nocookie.com/embed/${item.videoId}?cc_load_policy=1&cc_lang_pref=en`;
  }
  return null;
}

// Canonical "open at the official source" link.
export function getWatchUrl(item: MediaItem): string {
  return item.url;
}
