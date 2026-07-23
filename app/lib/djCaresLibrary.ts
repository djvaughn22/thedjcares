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

export type PlaybackExperience = "listen" | "watch" | "sermon" | "podcast";

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
  | "family-talk"
  | "harvest"
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
  playbackExperience: PlaybackExperience; // listen=audio, watch=video, sermon/podcast
  title: string;
  author: string; // artist, speaker, host, or show
  ministry?: MinistryKey;
  summary?: string; // DJ's short note — why it's here
  shortTitle?: string; // compact label for filter pills
  url: string; // canonical official source
  videoId?: string; // YouTube (oEmbed-verified)
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
    key: "in-touch",
    name: "In Touch Ministries",
    speaker: "Charles Stanley",
    purpose: "Trusted teaching — sermons, devotions, and daily broadcasts.",
    officialUrl: "https://www.intouch.org/",
    youtubeUrl: "https://www.youtube.com/@intouchministries",
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
    key: "family-talk",
    name: "Dr. James Dobson Family Institute",
    speaker: "James Dobson",
    purpose: "Faith-based help for marriage, parenting, and family life.",
    officialUrl: "https://www.drjamesdobson.org/",
    youtubeUrl: "https://www.youtube.com/channel/UCNgv7RLb0YMyIjB2KiXuGfA",
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
    key: "harvest",
    name: "Harvest with Greg Laurie",
    speaker: "Greg Laurie",
    purpose: "A new-generation evangelist in the crusade tradition — the Gospel, plainly preached.",
    officialUrl: "https://harvest.org/",
    youtubeUrl: "https://www.youtube.com/@greglaurie",
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
  playbackExperience: PlaybackExperience,
  title: string,
  author: string,
  videoId: string,
  vibes: Vibe[],
  extra: Partial<MediaItem> = {},
): MediaItem => ({
  id,
  type,
  playbackExperience,
  title,
  author,
  videoId,
  vibes,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  verified: "2026-07-18",
  ...extra,
});

const song = (id: string, title: string, author: string, videoId: string, vibes: Vibe[], extra: Partial<MediaItem> = {}) =>
  yt(id, "music", "watch", title, author, videoId, vibes, extra);

const sermon = (
  id: string,
  title: string,
  author: string,
  ministry: MinistryKey,
  videoId: string,
  vibes: Vibe[],
  extra: Partial<MediaItem> = {},
) => yt(id, "sermon", "sermon", title, author, videoId, vibes, { ministry, ...extra });

const applePl = (id: string, title: string, shortTitle: string, path: string, vibes: Vibe[], extra: Partial<MediaItem> = {}): MediaItem => ({
  shortTitle,
  id,
  type: "playlist",
  playbackExperience: "listen",
  title,
  author: "The DJ Cares",
  vibes,
  appleEmbed: `https://embed.music.apple.com/us/playlist/${path}`,
  url: `https://music.apple.com/us/playlist/${path}`,
  verified: "2026-07-18",
  ...extra,
});

// ---------------------------------------------------------------------------
// MUSIC — official artist/label uploads only. `` marks a
// proper official music video (those also show under Music Videos).
// ---------------------------------------------------------------------------
const MUSIC: MediaItem[] = [
  song("song-way-maker", "Way Maker", "Leeland", "iJCV_2H9xD0", ["Hope", "Worship"], { featured: true, summary: "Even when you don't see it, He's working. The first record on the deck." }),
  song("song-this-is-amazing-grace", "This Is Amazing Grace", "Phil Wickham", "XFRjr_x-yxU", ["Worship", "Gospel"], { duration: "4:59", summary: "The wonder of grace, sung loud." }),
  song("song-living-hope", "Living Hope", "Phil Wickham", "u-1fwZtKJSM", ["Hope", "Gospel"], { summary: "“Hallelujah, praise the One who set me free.”" }),
  song("song-battle-belongs", "Battle Belongs", "Phil Wickham", "qtvQNzPHn-w", ["Faith", "Hope"], { summary: "When it's too heavy — the fight was never yours alone." }),
  song("song-chains-are-gone", "Amazing Grace (My Chains Are Gone)", "Chris Tomlin", "Y-4NFvI5U9w", ["Worship", "Gospel"], { summary: "The old hymn with a new chorus of freedom." }),
  song("song-we-believe", "We Believe", "Newsboys", "WjZ01FcK0yk", ["Faith", "Worship"], { summary: "A creed you can sing." }),
  song("song-i-can-only-imagine", "I Can Only Imagine", "MercyMe", "N_lrrq_opng", ["Hope", "Worship"], { summary: "The song that made a generation look up." }),
  song("song-rise-up-lazarus", "Rise Up (Lazarus)", "CAIN", "8RIZlNYl4ok", ["Hope", "Joy"], { summary: "Come out of that grave — a resurrection anthem." }),
  song("song-even-if", "Even If", "MercyMe", "B6fA35Ved-Y", ["Faith", "Peace"], { summary: "Hope that holds even when the healing doesn't come." }),
  song("song-praise-you-in-this-storm", "Praise You in This Storm", "Casting Crowns", "0YUGwUgBvTU", ["Faith", "Peace"], { summary: "Worship that doesn't wait for the storm to pass." }),
  // Mood note: Anne Wilson's testimony born from her brother's death — Gospel
  // and hope, NOT Joy. Do not re-add a Joy vibe (see djMoodReview.ts).
  song("song-my-jesus", "My Jesus", "Anne Wilson", "FW5o2uBeMWQ", ["Gospel", "Hope"], { summary: "Let me tell you about my Jesus." }),
  song("song-just-be-held", "Just Be Held", "Casting Crowns", "tIZitK6_IMQ", ["Peace", "Faith"], { summary: "Stop holding on — and just be held." }),
  song("song-chain-breaker", "Chain Breaker", "Zach Williams", "cd_xxmXdQz4", ["Hope", "Gospel"], { summary: "If you've got chains, He's a chain breaker." }),
  song("song-fear-is-a-liar", "Fear Is a Liar", "Zach Williams", "1srs1YoTVzs", ["Peace", "Faith"], { summary: "Calling fear what it is." }),
  song("song-who-am-i", "Who Am I", "Casting Crowns", "3rT8Re1EIQc", ["Gospel", "Worship"], { duration: "5:34", summary: "Not because of who I am — because of what You've done." }),
  song("song-rescue-story", "Rescue Story", "Zach Williams", "Q3aP5iuJITg", ["Gospel", "Hope"], { summary: "You were the rescue story — live from Red Rocks." }),
  song("song-god-who-stays", "The God Who Stays", "Matthew West", "QPwd_TQpsHY", ["Peace", "Hope"], { summary: "He's the God who stays, even when you run." }),
  song("song-you-say", "You Say", "Lauren Daigle", "sIaT8Jl2zpI", ["Peace", "Faith"], { summary: "When the voices argue — believe what He says." }),
  song("song-christ-be-all-around-me", "Christ Be All Around Me", "All Sons & Daughters", "cmge-ycIkoo", ["Peace", "Prayer"], { summary: "A quiet prayer to carry through the day." }),
  // Mood note: a bereavement song — about MISSING family, not family time.
  // Hope only; never tag Family or Joy (see djMoodReview.ts).
  song("song-scars-in-heaven", "Scars in Heaven", "Casting Crowns", "qCdevloDE6E", ["Hope"], { summary: "For anyone missing someone — the only scars in heaven are His." }),
  song("song-holy-water", "Holy Water", "We The Kingdom", "7KLQ2AXQmtA", ["Worship", "Joy"], { summary: "Grace like holy water — live and joyful." }),
  song("song-good-day", "GOOD DAY", "Forrest Frank", "eO7-9WzLDZo", ["Joy"], { summary: "It's gonna be a good day. Turn it up." }),
  song("song-joy", "joy.", "for KING & COUNTRY", "lA7n7TwPDmw", ["Joy"], { summary: "Choosing joy on purpose." }),
  song("song-counting-my-blessings", "Counting My Blessings", "Seph Schlueter", "aZjWYgq9QfM", ["Joy", "Worship"], { summary: "A gratitude reset in one song." }),
  song("song-there-was-jesus", "There Was Jesus", "Zach Williams & Dolly Parton", "37wV6D49iEY", ["Hope", "Gospel"], { summary: "Looking back at the hardest roads and seeing He was there." }),
  // Hymns — official Reawaken Hymns (Nathan Drake) and Shane & Shane uploads.
  song("hymn-amazing-grace", "Amazing Grace", "Reawaken Hymns", "aDmcdZTEU5E", ["Hymns", "Gospel"], { summary: "“I once was lost, but now am found.”" }),
  song("hymn-how-great-thou-art", "How Great Thou Art", "Shane & Shane", "EueRjHaGbS4", ["Hymns", "Worship"], { duration: "5:07", summary: "“Then sings my soul…”" }),
  song("hymn-it-is-well", "It Is Well With My Soul", "Reawaken Hymns", "i4Mo9pkmd98", ["Hymns", "Peace"], { summary: "Written in deep grief — peace that holds anyway." }),
  song("hymn-blessed-assurance", "Blessed Assurance", "Reawaken Hymns", "6GJF1ac37lI", ["Hymns", "Joy"], { summary: "“Jesus is mine!” Confidence you can sing." }),
  song("hymn-great-is-thy-faithfulness", "Great Is Thy Faithfulness", "Reawaken Hymns", "lbDNkwcuBus", ["Hymns", "Hope"], { summary: "“Morning by morning new mercies I see.”" }),
];

// ---------------------------------------------------------------------------
// PLAYLISTS — DJ-curated Apple Music playlists (with Spotify twins where set).
// ---------------------------------------------------------------------------
const PLAYLISTS: MediaItem[] = [
  applePl("apple-faith-playlist", "Faith Playlist", "Faith", "faith-playlist/pl.u-2aoqXjzsNqgmY7", ["Faith", "Worship"], { featured: true, spotifyAlt: "https://open.spotify.com/playlist/37i9dQZF1DXcb6CQIjdqKy", summary: "The songs I keep coming back to. Press play and let faith rise." }),
  applePl("apple-todays-christian", "Today's Christian", "Today's", "todays-christian/pl.fecfa8a26ea44ad581d4fe501892c8ff", ["Worship"], { spotifyAlt: "https://open.spotify.com/playlist/37i9dQZF1DX5SzTPIoCKiv", summary: "Today's Christian music, hand-picked to encourage." }),
  applePl("apple-christian-rap", "Christian Rap Essentials", "Rap", "christian-rap-essentials/pl.981a3c7a4e4641ceae33034bc51bdceb", ["Joy"], { summary: "Faith-filled bars that point to Jesus." }),
  applePl("apple-christian-workout", "Christian Workout", "Workout", "christian-workout/pl.4f6345e9ab6f4782bd31250b74ec6b23", ["Joy"], { summary: "High-energy worship to move to." }),
  applePl("apple-country-faith", "Country Faith", "Country", "country-faith/pl.a1f19c594aa846c3898dd98dd99c8910", ["Hope"], { summary: "Country music with a faithful heart." }),
  applePl("apple-church-hymns", "Church Hymns", "Hymns", "church-hymns/pl.u-oZyll6RTRo9g6J", ["Hymns"], { summary: "The old hymns that have carried the church for generations." }),
];

// ---------------------------------------------------------------------------
// PODCASTS — official publisher embeds, or a clean card with the official
// listening destination. Never mixed into the sermon list.
// ---------------------------------------------------------------------------
const PODCASTS: MediaItem[] = [
  {
    id: "pod-thru-the-bible",
    type: "podcast",
    playbackExperience: "podcast",
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
    playbackExperience: "podcast",
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
    playbackExperience: "podcast",
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
    playbackExperience: "podcast",
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
    playbackExperience: "podcast",
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


  // James Dobson — Family Talk official channel.
  sermon("jd-wake-up-your-faith", "Wake Up Your Faith, Part One", "James Dobson", "family-talk", "brXxO1yaTB0", ["Faith", "Family"], { summary: "Faith that's awake at home first." }),
  sermon("jd-treasure-in-heaven", "Laying Up Treasure in Heaven, Part One", "James Dobson", "family-talk", "n1CuctOd4OY", ["Faith", "Family"], { summary: "What lasts longer than everything you own." }),
  sermon("jd-moral-character", "Building Moral Character in Your Children", "James Dobson", "family-talk", "7HJDSWbx4XI", ["Family"], { summary: "Practical help for raising kids of character." }),
  sermon("jd-firm-objectives", "Firm Objectives in Parenting", "James Dobson", "family-talk", "1bCRQVka6VM", ["Family"], { summary: "Parenting on purpose, not on autopilot." }),
];

// ---------------------------------------------------------------------------
// BULK SERMONS — generated from each ministry's own official channel
// (uploads + sermon-series playlists), filtered to full messages (15–90 min,
// low-controversy titles) and oEmbed-verified against the official channel.
// Regenerate with the harvest scripts rather than hand-editing; hand-curated
// favorites with summaries stay in SERMONS above.
// ---------------------------------------------------------------------------
const BULK_SERMONS: MediaItem[] = [
  // Billy Graham — 49 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("bg-P5LmDBoKyvs", "Couple\u2019s Home Explodes While They\u2019re Inside", "Billy Graham", "bgea", "P5LmDBoKyvs", ["Gospel"], { duration: "20:44" }),
  sermon("bg-2lQzuItKFk0", "Singer @Anne Wilson on Following \u2018My Jesus\u2019", "Billy Graham", "bgea", "2lQzuItKFk0", ["Gospel"], { duration: "24:03" }),
  sermon("bg--aDAHvPfBIc", "He Committed Murder at Age 16. Then He Got a Second Chance.", "Billy Graham", "bgea", "-aDAHvPfBIc", ["Gospel"], { duration: "25:03" }),
  sermon("bg-QneXVZiZ4uQ", "\u2018Normal Bloke\u2019 Building Massive Monument to Honor God", "Billy Graham", "bgea", "QneXVZiZ4uQ", ["Gospel"], { duration: "23:00" }),
  sermon("bg--xC7Ll_hwvQ", "Faith Without Sight: A Blind Pastor\u2019s Journey", "Billy Graham", "bgea", "-xC7Ll_hwvQ", ["Gospel"], { duration: "25:07" }),
  sermon("bg-q5OOsHdF7hE", "Changed | Billy Graham TV Special", "Billy Graham", "bgea", "q5OOsHdF7hE", ["Gospel"], { duration: "28:31" }),
  sermon("bg-vlnMW2FiEjc", "Combat Veteran Saved by Falling Bible", "Billy Graham", "bgea", "vlnMW2FiEjc", ["Gospel"], { duration: "23:24" }),
  sermon("bg-YNwbqqMafy0", "Easter with Franklin Graham: What is Truth?", "Billy Graham", "bgea", "YNwbqqMafy0", ["Gospel"], { duration: "28:31" }),
  sermon("bg-ZZcO8ac6S9k", "From NASA to AI: Tech Pioneer Wants to Glorify God", "Billy Graham", "bgea", "ZZcO8ac6S9k", ["Gospel"], { duration: "22:56" }),
  sermon("bg-U-Fe0KIbjd0", "Sex, Power, Riches and Materialism | Billy Graham Classic Sermon", "Billy Graham", "bgea", "U-Fe0KIbjd0", ["Gospel"], { duration: "27:32" }),
  sermon("bg-_47JL0sLoFE", "The Second Coming of Christ | Billy Graham Classic Sermon", "Billy Graham", "bgea", "_47JL0sLoFE", ["Gospel"], { duration: "27:32" }),
  sermon("bg-TTkwGgYRGHI", "When God Gets Your Attention | Billy Graham Classic Sermon", "Billy Graham", "bgea", "TTkwGgYRGHI", ["Gospel"], { duration: "27:33" }),
  sermon("bg-qWrA3mRilXU", "Just Say No | Billy Graham Classic Sermon", "Billy Graham", "bgea", "qWrA3mRilXU", ["Gospel"], { duration: "27:32" }),
  sermon("bg-ASWc-o-Ch_c", "The Person and Work of the Holy Spirit | Billy Graham Classic Sermon", "Billy Graham", "bgea", "ASWc-o-Ch_c", ["Gospel"], { duration: "27:32" }),
  sermon("bg-1Q6IMhCQnL8", "The Second Coming of Christ | Billy Graham Classic Sermon", "Billy Graham", "bgea", "1Q6IMhCQnL8", ["Gospel"], { duration: "27:32" }),
  sermon("bg-sBRylWJeHHE", "Loneliness | Billy Graham Classic Sermon", "Billy Graham", "bgea", "sBRylWJeHHE", ["Gospel"], { duration: "27:33" }),
  sermon("bg-FEAVWy1ILWo", "Choices | Billy Graham Classic Sermon", "Billy Graham", "bgea", "FEAVWy1ILWo", ["Gospel"], { duration: "27:33" }),
  sermon("bg-39kvqf-rl4k", "True Love | Billy Graham Classic Sermon", "Billy Graham", "bgea", "39kvqf-rl4k", ["Gospel"], { duration: "27:33" }),
  sermon("bg-7c_yxXjQMyI", "Jesus Calls You by Name | Billy Graham Classic Sermon", "Billy Graham", "bgea", "7c_yxXjQMyI", ["Gospel"], { duration: "27:32" }),
  sermon("bg-ahKWms8ItLQ", "True Love | Billy Graham Classic Sermon", "Billy Graham", "bgea", "ahKWms8ItLQ", ["Gospel"], { duration: "27:33" }),
  sermon("bg-UdsrlWUkTw0", "Choices We Make | Billy Graham Classic Sermon", "Billy Graham", "bgea", "UdsrlWUkTw0", ["Gospel"], { duration: "27:32" }),
  sermon("bg-DdPTER6S6iY", "A Cure for Heart Trouble | Billy Graham Classic Sermon", "Billy Graham", "bgea", "DdPTER6S6iY", ["Gospel"], { duration: "27:32" }),
  sermon("bg-zbKXkpiLcfk", "The Holy Spirit and You | Billy Graham Classic Sermon", "Billy Graham", "bgea", "zbKXkpiLcfk", ["Gospel"], { duration: "27:32" }),
  sermon("bg-OXGyACvE6BA", "The Danger of Neutrality | Billy Graham Classic Sermon", "Billy Graham", "bgea", "OXGyACvE6BA", ["Gospel"], { duration: "27:32" }),
  sermon("bg-7eud-rKWcBM", "The Death and Resurrection of Christ | Billy Graham Classic Sermon", "Billy Graham", "bgea", "7eud-rKWcBM", ["Gospel"], { duration: "27:32" }),
  sermon("bg-Gx9ncEwzeU0", "The Holy Spirit and You | Billy Graham Classic Sermon", "Billy Graham", "bgea", "Gx9ncEwzeU0", ["Gospel"], { duration: "27:32" }),
  sermon("bg-ZIU5KDr-oHA", "A Cure for Heart Trouble | Billy Graham Classic Sermon", "Billy Graham", "bgea", "ZIU5KDr-oHA", ["Gospel"], { duration: "28:31" }),
  sermon("bg-KNgoD5Ekpjg", "Is There A Hell? | Billy Graham Classic Sermon", "Billy Graham", "bgea", "KNgoD5Ekpjg", ["Gospel"], { duration: "27:32" }),
  sermon("bg-04dfNlJHhtI", "What\u2019s Wrong With the World? | Billy Graham Classic Sermon", "Billy Graham", "bgea", "04dfNlJHhtI", ["Gospel"], { duration: "27:33" }),
  sermon("bg-LypApEAAjbY", "Zacchaeus | Billy Graham Classic Sermon", "Billy Graham", "bgea", "LypApEAAjbY", ["Gospel"], { duration: "27:32" }),
  sermon("bg-vyB0A1HzbYc", "Living on the Fault Line | Billy Graham Classic Sermon", "Billy Graham", "bgea", "vyB0A1HzbYc", ["Gospel"], { duration: "27:32" }),
  sermon("bg--bSzmwDUdLk", "The Power of Forgiveness | Billy Graham Classic Sermon", "Billy Graham", "bgea", "-bSzmwDUdLk", ["Gospel"], { duration: "27:32" }),
  sermon("bg-TJPMlUeFdq8", "When the Chips Are Down, Can You Survive? | Billy Graham Classic Sermon", "Billy Graham", "bgea", "TJPMlUeFdq8", ["Gospel"], { duration: "27:32" }),
  sermon("bg--vOGxGce3OM", "The High Cost of Following Christ | Billy Graham Classic Sermon", "Billy Graham", "bgea", "-vOGxGce3OM", ["Gospel"], { duration: "27:32" }),
  sermon("bg-z1mcW0RSW7w", "The Real Meaning of the Cross | Billy Graham Classic Sermon", "Billy Graham", "bgea", "z1mcW0RSW7w", ["Gospel"], { duration: "27:32" }),
  sermon("bg-pbE8RPEJ1xg", "Fools | Billy Graham Classic Sermon", "Billy Graham", "bgea", "pbE8RPEJ1xg", ["Gospel"], { duration: "27:32" }),
  sermon("bg-vKquHzd2MaM", "The Hands of Jesus | Billy Graham Classic Sermon", "Billy Graham", "bgea", "vKquHzd2MaM", ["Gospel"], { duration: "27:32" }),
  sermon("bg-2-jXXiAoFOA", "Blood, Sweat & Tears to Salvation | Billy Graham Classic Sermon", "Billy Graham", "bgea", "2-jXXiAoFOA", ["Gospel"], { duration: "27:32" }),
  sermon("bg-GGQACnwkWmc", "Life After Death | Billy Graham Classic Sermon", "Billy Graham", "bgea", "GGQACnwkWmc", ["Gospel"], { duration: "27:32" }),
  sermon("bg-QHfynOaDQLQ", "How to Have a Happy Home | Billy Graham Classic Sermon", "Billy Graham", "bgea", "QHfynOaDQLQ", ["Gospel"], { duration: "27:32" }),
  sermon("bg-E_5PsxxD3PE", "Dead Men Tell No Tales | Billy Graham Classic Sermon", "Billy Graham", "bgea", "E_5PsxxD3PE", ["Gospel"], { duration: "27:32" }),
  sermon("bg-reG7zezrH9E", "Narrow is the Road | Billy Graham Classic Sermon", "Billy Graham", "bgea", "reG7zezrH9E", ["Gospel"], { duration: "27:32" }),
  sermon("bg-YJRRFYC0jKM", "Truth and Freedom | Billy Graham Classic Sermon", "Billy Graham", "bgea", "YJRRFYC0jKM", ["Gospel"], { duration: "27:32" }),
  sermon("bg-duJdk-rrI4o", "Jesus, The Hope of the World | Billy Graham Classic Sermon", "Billy Graham", "bgea", "duJdk-rrI4o", ["Gospel"], { duration: "27:33" }),
  sermon("bg-v4cJSTV7xzE", "What You Cannot Do Without | Billy Graham Classic Sermon", "Billy Graham", "bgea", "v4cJSTV7xzE", ["Gospel"], { duration: "27:32" }),
  sermon("bg-hB3f5DzsBNc", "The Power of a Positive No | Billy Graham Classic Sermon", "Billy Graham", "bgea", "hB3f5DzsBNc", ["Gospel"], { duration: "27:32" }),
  sermon("bg-VYQnejWqzKg", "A Cure for Heart Trouble | Billy Graham Classic Sermon", "Billy Graham", "bgea", "VYQnejWqzKg", ["Gospel"], { duration: "27:32" }),
  sermon("bg-vhTs8OgNuVU", "Excuses | Billy Graham Classic Sermon", "Billy Graham", "bgea", "vhTs8OgNuVU", ["Gospel"], { duration: "27:32" }),
  sermon("bg-bg7OFjDZH8o", "The Family | Billy Graham Classic Sermon", "Billy Graham", "bgea", "bg7OFjDZH8o", ["Gospel"], { duration: "27:32" }),

  // Adrian Rogers — 50 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("ar-6nesz5NEHYU", "When Life Doesn't Make Sense: How to Stand Firm in Faith | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "6nesz5NEHYU", ["Faith"], { duration: "39:25" }),
  sermon("ar-T3_sUsfunQw", "How to Have a Pure Thought Life | Biblical Truth by Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "T3_sUsfunQw", ["Faith"], { duration: "37:35" }),
  sermon("ar-y7nph1sFTa0", "The Heart of a Godly Father | Adrian Rogers  | Love Worth Finding", "Adrian Rogers", "lwf", "y7nph1sFTa0", ["Faith"], { duration: "38:35" }),
  sermon("ar-rYVXnCUs1M0", "How to Win the Battle for Your Home and Family | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "rYVXnCUs1M0", ["Faith"], { duration: "38:42" }),
  sermon("ar-Q_CYnjZrYCo", "What God Sees in Your Heart (And Why It Matters) | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "Q_CYnjZrYCo", ["Faith"], { duration: "40:59" }),
  sermon("ar-0VNlxcM61hg", "The Secret to True Fulfillment According to the Bible | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "0VNlxcM61hg", ["Faith"], { duration: "36:06" }),
  sermon("ar-O4N_nUMNOM0", "How to Be a Light in a Dark World | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "O4N_nUMNOM0", ["Faith"], { duration: "39:18" }),
  sermon("ar-mWIVBxihUhU", "What Does It Mean to Be the Salt of the Earth? | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "mWIVBxihUhU", ["Faith"], { duration: "35:24" }),
  sermon("ar-woYPe3ytMxs", "How to Raise Godly Children in Today\u2019s World | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "woYPe3ytMxs", ["Faith"], { duration: "35:32" }),
  sermon("ar-2_qhuKEPZYs", "How to Understand the Bible and Apply It to Your Life | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "2_qhuKEPZYs", ["Faith"], { duration: "42:10" }),
  sermon("ar-Hiq7s5sXHIk", "What Is Biblical Faith? And How to Have It | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "Hiq7s5sXHIk", ["Faith"], { duration: "35:28" }),
  sermon("ar-0Jhc7d2aHWA", "What Are Spiritual Gifts? And How to Use Yours | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "0Jhc7d2aHWA", ["Faith"], { duration: "39:50" }),
  sermon("ar-V8wWZDsP_us", "Satan\u2019s Lies Exposed: How to Recognize and Defeat Them | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "V8wWZDsP_us", ["Faith"], { duration: "40:53" }),
  sermon("ar-hPjwsDjr0UQ", "What Will Your Resurrection Body Be Like? | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "hPjwsDjr0UQ", ["Faith"], { duration: "40:41" }),
  sermon("ar-aIfYQOygHCI", "The Conquest", "Adrian Rogers", "lwf", "aIfYQOygHCI", ["Faith"], { duration: "23:36" }),
  sermon("ar-UpWZIMpQBp4", "The Cup", "Adrian Rogers", "lwf", "UpWZIMpQBp4", ["Faith"], { duration: "36:47" }),
  sermon("ar-JqTVqx9_6Ts", "The Cross", "Adrian Rogers", "lwf", "JqTVqx9_6Ts", ["Faith"], { duration: "38:57" }),
  sermon("ar-geOlf1q91Ag", "The Crown", "Adrian Rogers", "lwf", "geOlf1q91Ag", ["Faith"], { duration: "34:26" }),
  sermon("ar-rnhFjjfiajw", "6 Biblical Principles for Wise Decisions (1 Corinthians 6:12) | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "rnhFjjfiajw", ["Faith"], { duration: "43:14" }),
  sermon("ar-2rZFXXtuEAI", "How to Know God\u2019s Will: Clear Biblical Guidance for Decisions | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "2rZFXXtuEAI", ["Faith"], { duration: "42:35" }),
  sermon("ar-RbDPtCeqL8Q", "How to Feel God\u2019s Presence Daily: Practical Steps That Work | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "RbDPtCeqL8Q", ["Faith"], { duration: "39:52" }),
  sermon("ar-IBOr1mExbSU", "How to Grow Spiritually: God\u2019s Roadmap to Christian Maturity | Adrian Rogers", "Adrian Rogers", "lwf", "IBOr1mExbSU", ["Faith"], { duration: "39:27" }),
  sermon("ar-2cYyxoWFaJc", "Is Baptism Required After Salvation? Biblical Answers | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "2cYyxoWFaJc", ["Faith"], { duration: "38:19" }),
  sermon("ar-e03zo-lqKF0", "Does God Use Every Circumstance for Good? Romans 8:28 Explained | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "e03zo-lqKF0", ["Faith"], { duration: "39:52" }),
  sermon("ar-dpPYD9Q1BVQ", "How to Live a Spirit-Filled Christian Life | Biblical Teaching by Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "dpPYD9Q1BVQ", ["Faith"], { duration: "39:51" }),
  sermon("ar-rj3EA01j2-0", "How to Turn Temptation Into Victory | Biblical Teaching by Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "rj3EA01j2-0", ["Faith"], { duration: "41:04" }),
  sermon("ar-nt1HAHbCPfs", "How to Experience True Christian Fellowship | Adrian Rogers | Love Worth Finding", "Adrian Rogers", "lwf", "nt1HAHbCPfs", ["Faith"], { duration: "37:32" }),
  sermon("ar-gIgrHAQHKAA", "Adrian Rogers: How to Overcome Discouragement and Rise Again", "Adrian Rogers", "lwf", "gIgrHAQHKAA", ["Faith"], { duration: "30:43" }),
  sermon("ar-1_IgTfGw498", "Adrian Rogers: Can a Christian Lose Salvation? Eternal Security Explained", "Adrian Rogers", "lwf", "1_IgTfGw498", ["Faith"], { duration: "43:16" }),
  sermon("ar-85cWYtUFEJ8", "Adrian Rogers: How to Be Saved and Know You\u2019re Saved", "Adrian Rogers", "lwf", "85cWYtUFEJ8", ["Faith"], { duration: "37:42" }),
  sermon("ar-R6-5LnoI6OI", "Adrian Rogers: How Can We Know the Bible Is the Word of God?", "Adrian Rogers", "lwf", "R6-5LnoI6OI", ["Faith"], { duration: "39:21" }),
  sermon("ar-oLIQmmVvirk", "Adrian Rogers: God\u2019s Plan for Walking With Jesus Everyday", "Adrian Rogers", "lwf", "oLIQmmVvirk", ["Faith"], { duration: "34:25" }),
  sermon("ar-WlCVIkMxsFc", "Adrian Rogers: How God's Grace Breaks Every Chain and Sets You Free", "Adrian Rogers", "lwf", "WlCVIkMxsFc", ["Faith"], { duration: "39:43" }),
  sermon("ar-JKG_IU5Cn2A", "Adrian Rogers:  How to Live and Walk in God\u2019s Grace Everyday", "Adrian Rogers", "lwf", "JKG_IU5Cn2A", ["Faith"], { duration: "40:14" }),
  sermon("ar-0963OE-UrbA", "Dr. Adrian Rogers: God\u2019s Grace - From Sanctification to Glorification", "Adrian Rogers", "lwf", "0963OE-UrbA", ["Faith"], { duration: "38:13" }),
  sermon("ar-EKUWgR1Ovnw", "Dr. Adrian Rogers - What\u2019s Is God\u2019s Grace?", "Adrian Rogers", "lwf", "EKUWgR1Ovnw", ["Faith"], { duration: "36:29" }),
  sermon("ar-Q6jjYOzh8Ss", "Adrian Rogers: How to Find True Joy and Satisfaction When You Thirst For Righteousness", "Adrian Rogers", "lwf", "Q6jjYOzh8Ss", ["Faith"], { duration: "39:42" }),
  sermon("ar-wUZnLwlKIzw", "Adrian Rogers: How God Can Help Us Overcome Guilt and Grief", "Adrian Rogers", "lwf", "wUZnLwlKIzw", ["Faith"], { duration: "39:43" }),
  sermon("ar-ZvAkDf1ZfME", "Adrian Rogers: Why Meekness and A Humble Heart Is Not Weakness", "Adrian Rogers", "lwf", "ZvAkDf1ZfME", ["Faith"], { duration: "37:08" }),
  sermon("ar-d0h9R9hMzTw", "Adrian Rogers: How to Trust God\u2019s Promises In Difficult Times", "Adrian Rogers", "lwf", "d0h9R9hMzTw", ["Faith"], { duration: "35:21" }),
  sermon("ar-tf5mCmgPcDI", "Adrian Rogers: How to Cultivate a Merciful Heart", "Adrian Rogers", "lwf", "tf5mCmgPcDI", ["Faith"], { duration: "38:14" }),
  sermon("ar-C0JC-OQLiNo", "Adrian Rogers: How to Be Pure in Heart and Develop Godly Character", "Adrian Rogers", "lwf", "C0JC-OQLiNo", ["Faith"], { duration: "37:08" }),
  sermon("ar-JvE6kd_Gllg", "Adrian Rogers: How to Be a Peacemaker in a World of Conflict", "Adrian Rogers", "lwf", "JvE6kd_Gllg", ["Faith"], { duration: "35:19" }),
  sermon("ar-B6e8mrCczlU", "Adrian Rogers: How to Trust God When Persecuted For Righteousness\u2019 Sake", "Adrian Rogers", "lwf", "B6e8mrCczlU", ["Faith"], { duration: "29:09" }),
  sermon("ar-41iyhVm9ic0", "Adrian Rogers: Understanding The Lord\u2019s Prayer", "Adrian Rogers", "lwf", "41iyhVm9ic0", ["Faith"], { duration: "39:14" }),
  sermon("ar-Gu9rr-R1kqY", "Adrian Rogers: How to Pray - Unlocking the Power of Prayer", "Adrian Rogers", "lwf", "Gu9rr-R1kqY", ["Faith"], { duration: "39:01" }),
  sermon("ar-gIB3IH0I2bY", "Adrian Rogers: How to Pray for God\u2019s Will In Your Life", "Adrian Rogers", "lwf", "gIB3IH0I2bY", ["Faith"], { duration: "41:54" }),
  sermon("ar-f_oSykdjBUQ", "Adrian Rogers: Praying for God\u2019s Forgiveness - A Path to Spiritual Growth", "Adrian Rogers", "lwf", "f_oSykdjBUQ", ["Faith"], { duration: "44:07" }),
  sermon("ar-jDf4eQFzkhQ", "Adrian Rogers:  4 Simple Steps to Strengthen Your Daily Prayer", "Adrian Rogers", "lwf", "jDf4eQFzkhQ", ["Faith"], { duration: "37:59" }),
  sermon("ar-qJZS-nlObSo", "Adrian Rogers: The Keys to the Fervent Power of Effectual Prayer", "Adrian Rogers", "lwf", "qJZS-nlObSo", ["Faith"], { duration: "25:51" }),

  // Charles Stanley — 50 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("cs-KDLgeRq1N-g", "The Gift of God's Love - Part 1", "Charles Stanley", "in-touch", "KDLgeRq1N-g", ["Faith"], { duration: "19:35" }),
  sermon("cs-yjvoSp9ms7Y", "Created to Love - Part 2", "Charles Stanley", "in-touch", "yjvoSp9ms7Y", ["Faith"], { duration: "20:03" }),
  sermon("cs-3DBWkDMO-uQ", "Created to Love - Part 1", "Charles Stanley", "in-touch", "3DBWkDMO-uQ", ["Faith"], { duration: "19:16" }),
  sermon("cs-3_i-lg7DplE", "The Consequences of Uncontrolled Weakness", "Charles Stanley", "in-touch", "3_i-lg7DplE", ["Faith"], { duration: "19:28" }),
  sermon("cs-zsvTCwBnvl0", "Integrity in the Life of the Believer \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "zsvTCwBnvl0", ["Faith"], { duration: "30:09" }),
  sermon("cs-kDm65TLyaHk", "The Pattern \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "kDm65TLyaHk", ["Faith"], { duration: "22:10" }),
  sermon("cs-MiyOOqdPBkQ", "Made for the Mountains", "Charles Stanley", "in-touch", "MiyOOqdPBkQ", ["Faith"], { duration: "19:09" }),
  sermon("cs-rxD1Y-gOw1U", "The Pattern for What You Believe - Part 3", "Charles Stanley", "in-touch", "rxD1Y-gOw1U", ["Faith"], { duration: "19:51" }),
  sermon("cs-E-QBpinc7eY", "The Pattern for What You Believe - Part 2", "Charles Stanley", "in-touch", "E-QBpinc7eY", ["Faith"], { duration: "19:27" }),
  sermon("cs-ALCH4Ag41SE", "The Pattern for What You Believe - Part 1", "Charles Stanley", "in-touch", "ALCH4Ag41SE", ["Faith"], { duration: "20:02" }),
  sermon("cs-jwUoHcUQp9o", "Does It Matter What You Believe? - Part 2", "Charles Stanley", "in-touch", "jwUoHcUQp9o", ["Faith"], { duration: "19:39" }),
  sermon("cs-Ce73rRaorcY", "Does It Matter What You Believe? - Part 1", "Charles Stanley", "in-touch", "Ce73rRaorcY", ["Faith"], { duration: "19:29" }),
  sermon("cs-VJ7ZcSsM7aM", "Surviving Our Present Culture \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "VJ7ZcSsM7aM", ["Faith"], { duration: "29:40" }),
  sermon("cs-GYzACLaJGVg", "Real Freedom \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "GYzACLaJGVg", ["Faith"], { duration: "26:22" }),
  sermon("cs-UD2cwsloCXk", "Things That Cannot Be Shaken", "Charles Stanley", "in-touch", "UD2cwsloCXk", ["Faith"], { duration: "20:20" }),
  sermon("cs-pCY3uROotBU", "Real Freedom - Part 2", "Charles Stanley", "in-touch", "pCY3uROotBU", ["Faith"], { duration: "19:30" }),
  sermon("cs-aZzdWAdrCDg", "Real Freedom - Part 1", "Charles Stanley", "in-touch", "aZzdWAdrCDg", ["Faith"], { duration: "18:47" }),
  sermon("cs-LsNpBgECY70", "Bearing One Another's Burdens - From the Pastor's Heart Podcast", "Charles Stanley", "in-touch", "LsNpBgECY70", ["Faith"], { duration: "20:43" }),
  sermon("cs-z4Dn-DMKPUM", "Cautions Against Complacency", "Charles Stanley", "in-touch", "z4Dn-DMKPUM", ["Faith"], { duration: "19:17" }),
  sermon("cs-CBayxwDAryc", "Surviving Our Present Culture - Part 2", "Charles Stanley", "in-touch", "CBayxwDAryc", ["Faith"], { duration: "19:22" }),
  sermon("cs-p_yhWlCbmRo", "Surviving Our Present Culture - Part 1", "Charles Stanley", "in-touch", "p_yhWlCbmRo", ["Faith"], { duration: "19:39" }),
  sermon("cs--jZVcHuQcbE", "A Warning Against Spiritual Drifting \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "-jZVcHuQcbE", ["Faith"], { duration: "30:07" }),
  sermon("cs-cRvJd4d_GUc", "Finding Clear Guidance \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "cRvJd4d_GUc", ["Faith"], { duration: "23:40" }),
  sermon("cs-rRr9zeK8L9s", "The Continuing Consequences of Our Conduct - Part 2", "Charles Stanley", "in-touch", "rRr9zeK8L9s", ["Faith"], { duration: "18:33" }),
  sermon("cs-lhjZ6_ej5ws", "Eternal Life:  You Can Be Sure - Part 2", "Charles Stanley", "in-touch", "lhjZ6_ej5ws", ["Faith"], { duration: "19:32" }),
  sermon("cs-d5nT5WgV7Mg", "Eternal Life:  You Can Be Sure - Part 1", "Charles Stanley", "in-touch", "d5nT5WgV7Mg", ["Faith"], { duration: "19:04" }),
  sermon("cs-cH6fet8Vw8Q", "Eternal Life: Do You Want It?", "Charles Stanley", "in-touch", "cH6fet8Vw8Q", ["Faith"], { duration: "19:32" }),
  sermon("cs-ovFwPk-dq0M", "Encouragement for the Troubled Heart - Part 2", "Charles Stanley", "in-touch", "ovFwPk-dq0M", ["Faith"], { duration: "19:50" }),
  sermon("cs-s8JBaf2i3PA", "Encouragement for the Troubled Heart - Part 1", "Charles Stanley", "in-touch", "s8JBaf2i3PA", ["Faith"], { duration: "19:54" }),
  sermon("cs-cVIHcdDg5r8", "Life's Number One Priority \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "cVIHcdDg5r8", ["Faith"], { duration: "30:09" }),
  sermon("cs-qSuYEzT8jY4", "Making a Good Connection \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "qSuYEzT8jY4", ["Faith"], { duration: "21:00" }),
  sermon("cs-ZxP8FLt1K1o", "The Continuing Consequences of Our Conduct - Part 1", "Charles Stanley", "in-touch", "ZxP8FLt1K1o", ["Faith"], { duration: "19:30" }),
  sermon("cs--1-mT5SIIEI", "How the Truth Can Set You Free, Part 10", "Charles Stanley", "in-touch", "-1-mT5SIIEI", ["Faith"], { duration: "20:33" }),
  sermon("cs-ynfhCJFxcVw", "How the Truth Can Set You Free, Part 9", "Charles Stanley", "in-touch", "ynfhCJFxcVw", ["Faith"], { duration: "19:23" }),
  sermon("cs-2xpB2EeCWHk", "How the Truth Can Set You Free, Part 8", "Charles Stanley", "in-touch", "2xpB2EeCWHk", ["Faith"], { duration: "20:19" }),
  sermon("cs-pILRZysBAd4", "How the Truth Can Set You Free, Part 7", "Charles Stanley", "in-touch", "pILRZysBAd4", ["Faith"], { duration: "20:00" }),
  sermon("cs-7-P66dlq2FQ", "How the Truth Can Set You Free, Part 6", "Charles Stanley", "in-touch", "7-P66dlq2FQ", ["Faith"], { duration: "20:13" }),
  sermon("cs-Y2swO169vV8", "Faith That Wavers \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "Y2swO169vV8", ["Faith"], { duration: "29:38" }),
  sermon("cs-LHnQ-5_PdS4", "Walking in the Favor of God \u2013 Part 3 \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "LHnQ-5_PdS4", ["Faith"], { duration: "26:23" }),
  sermon("cs-IiIpDUELRGY", "Walking in the Favor of God \u2013 Part 2 \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "IiIpDUELRGY", ["Faith"], { duration: "26:24" }),
  sermon("cs-HlAYoG6iUz8", "Walking in the Favor of God \u2013 Part 1 \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "HlAYoG6iUz8", ["Faith"], { duration: "23:34" }),
  sermon("cs-pT6hBQCQwbE", "The Fear of God \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "pT6hBQCQwbE", ["Faith"], { duration: "26:35" }),
  sermon("cs-acaG65bFYj8", "Putting Prayer First \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "acaG65bFYj8", ["Faith"], { duration: "23:20" }),
  sermon("cs-_bQFhimQYfA", "How to Love Your Mother \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "_bQFhimQYfA", ["Faith"], { duration: "26:33" }),
  sermon("cs-8V1_xpTLMj8", "Obedience in the Life of the Believer \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "8V1_xpTLMj8", ["Faith"], { duration: "28:58" }),
  sermon("cs-sTyNJ1RKTk0", "Grace: God's New Lifestyle \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "sTyNJ1RKTk0", ["Faith"], { duration: "23:08" }),
  sermon("cs-9qgExBKiayU", "The Grace of God and Our Finances \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "9qgExBKiayU", ["Faith"], { duration: "26:34" }),
  sermon("cs-5ifRmKZtVkQ", "The High Cost of God's Grace \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "5ifRmKZtVkQ", ["Faith"], { duration: "22:41" }),
  sermon("cs-ptYKozbfQ50", "Right Thinking About Death and Resurrection \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "ptYKozbfQ50", ["Faith"], { duration: "26:36" }),
  sermon("cs-26gAZyTgkSU", "Confronting the Cross \u2013 Dr. Charles Stanley", "Charles Stanley", "in-touch", "26gAZyTgkSU", ["Faith"], { duration: "23:01" }),

  // David Jeremiah — 49 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("dj-GhiorSJ-y60", "The Gifts of the Spirit | Dr. David Jeremiah", "David Jeremiah", "turning-point", "GhiorSJ-y60", ["Faith"], { duration: "21:51" }),
  sermon("dj--e0t8UZFP9M", "A Prayer From a Cave (Pt. 2)", "David Jeremiah", "turning-point", "-e0t8UZFP9M", ["Faith"], { duration: "25:27" }),
  sermon("dj-iyzd9DF_oZg", "Hiding in the Cave: The Power of Psalm 142 | Dr. David Jeremiah", "David Jeremiah", "turning-point", "iyzd9DF_oZg", ["Faith"], { duration: "25:29" }),
  sermon("dj-ormNxAeNVZ4", "When Trials Become Our Teacher (Pt. 2)", "David Jeremiah", "turning-point", "ormNxAeNVZ4", ["Faith"], { duration: "25:30" }),
  sermon("dj-CbHze8aa7iY", "When Trials Become Our Teacher (Pt. 1)", "David Jeremiah", "turning-point", "CbHze8aa7iY", ["Faith"], { duration: "25:28" }),
  sermon("dj-FMsjUtpK5lI", "Trusting God in Times of Trouble (Pt. 2)", "David Jeremiah", "turning-point", "FMsjUtpK5lI", ["Faith"], { duration: "25:29" }),
  sermon("dj-iQpK4AeIXcI", "The Work of the Spirit | Dr. David Jeremiah", "David Jeremiah", "turning-point", "iQpK4AeIXcI", ["Faith"], { duration: "21:36" }),
  sermon("dj-FCQjXhGxHn4", "Trusting God in Times of Trouble (Pt. 1)", "David Jeremiah", "turning-point", "FCQjXhGxHn4", ["Faith"], { duration: "25:19" }),
  sermon("dj-llK9mYKTVx0", "How to Get Through the Wilderness (Pt. 2)", "David Jeremiah", "turning-point", "llK9mYKTVx0", ["Faith"], { duration: "25:17" }),
  sermon("dj-UJxRide0Sug", "How to Get Through the Wilderness (Pt. 1)", "David Jeremiah", "turning-point", "UJxRide0Sug", ["Faith"], { duration: "25:20" }),
  sermon("dj-UTQz4NOKwJw", "Finding Strength Through Weakness (Pt. 2)", "David Jeremiah", "turning-point", "UTQz4NOKwJw", ["Faith"], { duration: "25:19" }),
  sermon("dj-cI4EwzoMU4U", "Finding Strength Through Weakness (Pt. 1)", "David Jeremiah", "turning-point", "cI4EwzoMU4U", ["Faith"], { duration: "25:19" }),
  sermon("dj--uuOItseW3c", "The Fruit of the Spirit | Dr. David Jeremiah", "David Jeremiah", "turning-point", "-uuOItseW3c", ["Faith"], { duration: "21:26" }),
  sermon("dj-EDefORbjQXc", "Going Up by Going Down (Pt. 2)", "David Jeremiah", "turning-point", "EDefORbjQXc", ["Faith"], { duration: "25:18" }),
  sermon("dj-tT96MzWJBjY", "Going Up by Going Down (Pt. 1)", "David Jeremiah", "turning-point", "tT96MzWJBjY", ["Faith"], { duration: "25:19" }),
  sermon("dj-GoHumn9k3GU", "How to Renew Your Strength When You Are Exhausted and Stressed | Dr. David Jeremiah", "David Jeremiah", "turning-point", "GoHumn9k3GU", ["Faith"], { duration: "25:21" }),
  sermon("dj-LNbIij56euI", "How to Let the Holy Spirit Control Your Walk and Witness | Dr. David Jeremiah", "David Jeremiah", "turning-point", "LNbIij56euI", ["Faith"], { duration: "25:17" }),
  sermon("dj-lhmWSvKPPkw", "When the Holy Spirit Controls Your Life (Pt. 1)", "David Jeremiah", "turning-point", "lhmWSvKPPkw", ["Faith"], { duration: "25:15" }),
  sermon("dj-7h9vbGHZFGE", "Walking in the Spirit | Dr. David Jeremiah", "David Jeremiah", "turning-point", "7h9vbGHZFGE", ["Faith"], { duration: "22:30" }),
  sermon("dj-yKP8AP831Wk", "The Best Evidence of the Spirit (Pt. 2)", "David Jeremiah", "turning-point", "yKP8AP831Wk", ["Faith"], { duration: "25:23" }),
  sermon("dj-4AswWS1oa3I", "The Best Evidence of the Spirit (Pt. 1)", "David Jeremiah", "turning-point", "4AswWS1oa3I", ["Faith"], { duration: "25:24" }),
  sermon("dj-nr8nQpzeJqQ", "The Strength of the Spirit (Pt. 2)", "David Jeremiah", "turning-point", "nr8nQpzeJqQ", ["Faith"], { duration: "25:25" }),
  sermon("dj-2YOIbp66nLg", "The Strength of the Spirit (Pt. 1)", "David Jeremiah", "turning-point", "2YOIbp66nLg", ["Faith"], { duration: "25:26" }),
  sermon("dj-kXAIdmYZEns", "The Gifts of the Spirit (Pt. 2)", "David Jeremiah", "turning-point", "kXAIdmYZEns", ["Faith"], { duration: "25:26" }),
  sermon("dj-umP5meZn690", "The Filling of the Spirit | Dr. David Jeremiah", "David Jeremiah", "turning-point", "umP5meZn690", ["Faith"], { duration: "22:39" }),
  sermon("dj-ZxP-QRcVoZE", "Born of the Spirit | Dr. David Jeremiah", "David Jeremiah", "turning-point", "ZxP-QRcVoZE", ["Faith"], { duration: "23:09" }),
  sermon("dj-fcaBM77EyvQ", "The Holy Spirit: Understanding His Power and Presence Within You | Dr. David Jeremiah", "David Jeremiah", "turning-point", "fcaBM77EyvQ", ["Faith"], { duration: "22:35" }),
  sermon("dj-arQmQxKNUeE", "Are You Enjoying Your Life? | Dr. David Jeremiah on Ecclesiastes & Living Fully Engaged", "David Jeremiah", "turning-point", "arQmQxKNUeE", ["Faith"], { duration: "35:49" }),
  sermon("dj-MtzBPkbFjwk", "The Gospel Is the Power of God (Romans 1:16\u201317) | Dr. David Jeremiah: Fully Engaged With the Gospel", "David Jeremiah", "turning-point", "MtzBPkbFjwk", ["Faith"], { duration: "39:09" }),
  sermon("dj-_SCwEmaKQBw", "The Only Way to Love God Is to Love Others | Dr. David Jeremiah: Fully Engaged With God (Deut. 6)", "David Jeremiah", "turning-point", "_SCwEmaKQBw", ["Faith"], { duration: "26:33" }),
  sermon("dj-9y3MD8uiTRk", "The Promise of Heaven Interview with Dr. David Jeremiah", "David Jeremiah", "turning-point", "9y3MD8uiTRk", ["Faith"], { duration: "25:14" }),
  sermon("dj-q6r2p-YEmBk", "The Promise of Heaven | Dr. David Jeremiah | John 14:1-6", "David Jeremiah", "turning-point", "q6r2p-YEmBk", ["Faith"], { duration: "25:23" }),
  sermon("dj-P0yKbKwLX2A", "What's Up With Heaven? | Dr. David Jeremiah", "David Jeremiah", "turning-point", "P0yKbKwLX2A", ["Faith"], { duration: "24:39" }),
  sermon("dj-Wbf8m-lVv7o", "A Body For Heaven | Dr. David Jeremiah", "David Jeremiah", "turning-point", "Wbf8m-lVv7o", ["Faith"], { duration: "24:36" }),
  sermon("dj-0NOT3GsUkg8", "The Celestial City | Dr. David Jeremiah | Revelation 21 & 22", "David Jeremiah", "turning-point", "0NOT3GsUkg8", ["Faith"], { duration: "22:22" }),
  sermon("dj-GDgM6lBuhOo", "Heavenly Worship", "David Jeremiah", "turning-point", "GDgM6lBuhOo", ["Faith"], { duration: "22:12" }),
  sermon("dj-pip6ygtmqD4", "Jesus is The Way...The Truth...The Life - The Promise of Heaven", "David Jeremiah", "turning-point", "pip6ygtmqD4", ["Faith"], { duration: "23:42" }),
  sermon("dj-NEdeWKXmO8g", "The 5 Crowns in Heaven: What Every Christian Should Know", "David Jeremiah", "turning-point", "NEdeWKXmO8g", ["Faith"], { duration: "24:43" }),
  sermon("dj-4hcFUEEzlII", "Won't Heaven Be Boring? | Dr. David Jeremiah", "David Jeremiah", "turning-point", "4hcFUEEzlII", ["Faith"], { duration: "24:35" }),
  sermon("dj-vmhdV_GjvRw", "Where Are They Now? | Dr. David Jeremiah", "David Jeremiah", "turning-point", "vmhdV_GjvRw", ["Faith"], { duration: "22:44" }),
  sermon("dj-SgtZPmxzgF4", "If a Child Dies\u2026 Where Do They Go? Biblical Answer Explained", "David Jeremiah", "turning-point", "SgtZPmxzgF4", ["Faith"], { duration: "25:15" }),
  sermon("dj-VfjPVRhxiqA", "Tough-Minded About Heaven | Dr. David Jeremiah | 2 Peter 3:10-18", "David Jeremiah", "turning-point", "VfjPVRhxiqA", ["Faith"], { duration: "24:41" }),
  sermon("dj-mUd7e-eR9H8", "A Life-Changing Prayer | Dr. David Jeremiah | Colossins1:9-14", "David Jeremiah", "turning-point", "mUd7e-eR9H8", ["Faith"], { duration: "23:52" }),
  sermon("dj-8kXuxk0Vjfk", "Why Don't My Prayers Get Answered? | Dr. David Jeremiah", "David Jeremiah", "turning-point", "8kXuxk0Vjfk", ["Faith"], { duration: "23:45" }),
  sermon("dj-npc7X6pzZfs", "The Great Adventure of Prayer | Dr. David Jeremiah | Matthew 7:7-11", "David Jeremiah", "turning-point", "npc7X6pzZfs", ["Faith"], { duration: "22:52" }),
  sermon("dj-bvkfeJV4mZQ", "Prayer - The Great Adventure Interview with Dr. David Jeremiah", "David Jeremiah", "turning-point", "bvkfeJV4mZQ", ["Faith"], { duration: "24:44" }),
  sermon("dj-2XyVKPmud18", "Knowing a Loving God | Dr. David Jeremiah", "David Jeremiah", "turning-point", "2XyVKPmud18", ["Faith"], { duration: "23:42" }),
  sermon("dj-qTC0QhNNxGE", "Knowing a Sovereign God | Dr. David Jeremiah", "David Jeremiah", "turning-point", "qTC0QhNNxGE", ["Faith"], { duration: "23:31" }),
  sermon("dj-9rY9Y766dJM", "Knowing a Holy God | Dr. David Jeremiah", "David Jeremiah", "turning-point", "9rY9Y766dJM", ["Faith"], { duration: "23:47" }),

  // James Dobson — 47 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("jd-1lkXccEWuVU", "One Scoop at a Time", "James Dobson", "family-talk", "1lkXccEWuVU", ["Family"], { duration: "25:57" }),
  sermon("jd-4MZJbzSUgA4", "Laying Up Treasure in Heaven, Part Two", "James Dobson", "family-talk", "4MZJbzSUgA4", ["Family"], { duration: "25:57" }),
  sermon("jd-GKqki86cU40", "Wake Up Your Faith Part Two", "James Dobson", "family-talk", "GKqki86cU40", ["Family"], { duration: "25:57" }),
  sermon("jd-44q62Cnqe84", "Living The Good Life Part Two", "James Dobson", "family-talk", "44q62Cnqe84", ["Family"], { duration: "25:57" }),
  sermon("jd-7A6mHvgJIVA", "Living The Good Life Part One", "James Dobson", "family-talk", "7A6mHvgJIVA", ["Family"], { duration: "25:57" }),
  sermon("jd-uUmG6mmv6FI", "Celebrating God Our Founder, Pt. 1", "James Dobson", "family-talk", "uUmG6mmv6FI", ["Family"], { duration: "25:57" }),
  sermon("jd-X15gO15S4QA", "Celebrating God Our Founder, Pt. 2", "James Dobson", "family-talk", "X15gO15S4QA", ["Family"], { duration: "25:57" }),
  sermon("jd-dD9JNOdzZnI", "Encouragement for the Single Life", "James Dobson", "family-talk", "dD9JNOdzZnI", ["Family"], { duration: "25:57" }),
  sermon("jd-i5-QDFORwU8", "Dr. Dobson Looks Back", "James Dobson", "family-talk", "i5-QDFORwU8", ["Family"], { duration: "25:57" }),
  sermon("jd-jsxTIp_Qaso", "Avoiding The Traps Of Inauthentic Faith Part 2", "James Dobson", "family-talk", "jsxTIp_Qaso", ["Family"], { duration: "25:57" }),
  sermon("jd-kg2zYs2bNr0", "Avoiding The Traps Of Inauthentic Faith", "James Dobson", "family-talk", "kg2zYs2bNr0", ["Family"], { duration: "25:57" }),
  sermon("jd-aM95CHd2uo8", "Using Radio To Spread The Gospel Part Two", "James Dobson", "family-talk", "aM95CHd2uo8", ["Family"], { duration: "25:57" }),
  sermon("jd-TeKuVvINlnc", "Using Radio Broadcasting To Spread The Gospel Part One", "James Dobson", "family-talk", "TeKuVvINlnc", ["Family"], { duration: "25:57" }),
  sermon("jd-zjhRzilCp3E", "Raising Girls Who Know Their Worth Part Two", "James Dobson", "family-talk", "zjhRzilCp3E", ["Family"], { duration: "25:57" }),
  sermon("jd-h_a5uQT3I6Y", "Raising Girls Who Know Their Worth Part One", "James Dobson", "family-talk", "h_a5uQT3I6Y", ["Family"], { duration: "25:57" }),
  sermon("jd-rOYq-WrZYSQ", "Man To Man Part One", "James Dobson", "family-talk", "rOYq-WrZYSQ", ["Family"], { duration: "25:57" }),
  sermon("jd-vN211iU4L2Q", "Man To Man Part Two", "James Dobson", "family-talk", "vN211iU4L2Q", ["Family"], { duration: "25:57" }),
  sermon("jd-AACOUr2ywlU", "Gods Fingerprint On The Universet.", "James Dobson", "family-talk", "AACOUr2ywlU", ["Family"], { duration: "25:57" }),
  sermon("jd-2smhMhOl7Ao", "Defusing Anger In Marriage", "James Dobson", "family-talk", "2smhMhOl7Ao", ["Family"], { duration: "25:57" }),
  sermon("jd-kCwlsoDWRpE", "Father-Daughter Memories", "James Dobson", "family-talk", "kCwlsoDWRpE", ["Family"], { duration: "25:57" }),
  sermon("jd-GFKU6PojEYc", "Cultivating Deeper Connections In A Lonely World, Part Two", "James Dobson", "family-talk", "GFKU6PojEYc", ["Family"], { duration: "25:57" }),
  sermon("jd-HW2nSjckpSU", "Cultivating Deeper Connections In A Lonely World, Part One", "James Dobson", "family-talk", "HW2nSjckpSU", ["Family"], { duration: "25:57" }),
  sermon("jd-j5V60-wyx9s", "Raising Boys, Part Two", "James Dobson", "family-talk", "j5V60-wyx9s", ["Family"], { duration: "25:57" }),
  sermon("jd-mE4wa6ql8Q8", "Raising Boys, Part One", "James Dobson", "family-talk", "mE4wa6ql8Q8", ["Family"], { duration: "25:57" }),
  sermon("jd-x7TkUsyRImA", "The Pain of Illiteracy", "James Dobson", "family-talk", "x7TkUsyRImA", ["Family"], { duration: "25:57" }),
  sermon("jd-YBRcUNe8VbI", "Childhood Memories, Part 2", "James Dobson", "family-talk", "YBRcUNe8VbI", ["Family"], { duration: "25:57" }),
  sermon("jd-Yrdu_0RIHSY", "Childhood Memories, Part 1", "James Dobson", "family-talk", "Yrdu_0RIHSY", ["Family"], { duration: "25:57" }),
  sermon("jd-IZkJF81oJ2g", "Storming the Beach: Remembering the Sacrifice of D-Day, Part 2", "James Dobson", "family-talk", "IZkJF81oJ2g", ["Family"], { duration: "25:57" }),
  sermon("jd-pGPcRDuKliY", "Tru Plays Battle For Christian Values Online Part 1", "James Dobson", "family-talk", "pGPcRDuKliY", ["Family"], { duration: "25:57" }),
  sermon("jd-r3ZvV5oI20k", "Tru Plays Battle For Christian Values Online Part 2", "James Dobson", "family-talk", "r3ZvV5oI20k", ["Family"], { duration: "25:57" }),
  sermon("jd-TJjArLCMlOs", "Storming the Beach: Remembering the Sacrifice of D-Day, Part 1", "James Dobson", "family-talk", "TJjArLCMlOs", ["Family"], { duration: "25:57" }),
  sermon("jd-6fGAvAqxypw", "How Parents Can Find Peace and Hope with Their Adult Children, Pt. 2", "James Dobson", "family-talk", "6fGAvAqxypw", ["Family"], { duration: "25:57" }),
  sermon("jd-71ake3bmehw", "How Parents Can Resolve Conflict and Find Peace with Their Adult Children, Pt. 1", "James Dobson", "family-talk", "71ake3bmehw", ["Family"], { duration: "25:57" }),
  sermon("jd-l4r8WSZ_dRg", "What Parents Should Know About Teens Part Two", "James Dobson", "family-talk", "l4r8WSZ_dRg", ["Family"], { duration: "25:57" }),
  sermon("jd-ALA09XOZ0zE", "What Parents Should Know About Teens Part One", "James Dobson", "family-talk", "ALA09XOZ0zE", ["Family"], { duration: "25:57" }),
  sermon("jd-U9-L8sl1MhE", "What The Bible Says About Being A Man", "James Dobson", "family-talk", "U9-L8sl1MhE", ["Family"], { duration: "25:57" }),
  sermon("jd-wsML1k3mvJQ", "You May Be The Only Bible Somebody Reads, Part Two", "James Dobson", "family-talk", "wsML1k3mvJQ", ["Family"], { duration: "25:57" }),
  sermon("jd-yrWfS0pbp5k", "You May Be The Only Bible Somebody Reads Part One", "James Dobson", "family-talk", "yrWfS0pbp5k", ["Family"], { duration: "25:57" }),
  sermon("jd-7y9fMadSEYs", "God Won't Leave You There, Part 2", "James Dobson", "family-talk", "7y9fMadSEYs", ["Family"], { duration: "25:57" }),
  sermon("jd-WhLJ0JgadBM", "God Won't Leave You There, Part 1", "James Dobson", "family-talk", "WhLJ0JgadBM", ["Family"], { duration: "25:58" }),
  sermon("jd-jXxZXmT9gJ8", "God\u2019s Help in My Life: The Story of Dale Evans", "James Dobson", "family-talk", "jXxZXmT9gJ8", ["Family"], { duration: "25:57" }),
  sermon("jd-KadaMXgSmhc", "The Last Words of Jesus, Part 2", "James Dobson", "family-talk", "KadaMXgSmhc", ["Family"], { duration: "25:57" }),
  sermon("jd-X_-CX92NloY", "The Last Words of Jesus, Part 3", "James Dobson", "family-talk", "X_-CX92NloY", ["Family"], { duration: "25:57" }),
  sermon("jd-gdFwnv1H0Es", "The Last Words of Jesus, Part 1", "James Dobson", "family-talk", "gdFwnv1H0Es", ["Family"], { duration: "25:57" }),
  sermon("jd-bJfdNIB9ci0", "The Joy of Aligning Your Money And Faith Part Two", "James Dobson", "family-talk", "bJfdNIB9ci0", ["Family"], { duration: "25:57" }),
  sermon("jd-pefYgFNPmHc", "The Joy Of Aligning Your Money And Faith Part One", "James Dobson", "family-talk", "pefYgFNPmHc", ["Family"], { duration: "25:57" }),
  sermon("jd-bey7pAdeZOc", "Why The Need For A Savior", "James Dobson", "family-talk", "bey7pAdeZOc", ["Family"], { duration: "25:57" }),

  // Allen Jackson — 50 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("aj-L0MRPeOr9JY", "Expressions of Dangerous Faith | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "L0MRPeOr9JY", ["Faith"], { duration: "48:59" }),
  sermon("aj-Lyjeg38qL0Q", "Dangerous Faith [Strength & Courage] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "Lyjeg38qL0Q", ["Faith"], { duration: "44:34" }),
  sermon("aj-zJy-_Lokuhk", "Dangerous Faith [Strength Provided] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "zJy-_Lokuhk", ["Faith"], { duration: "45:10" }),
  sermon("aj-kQ-I2fmI7ho", "Dangerous Faith [New Responses, New Opportunities] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "kQ-I2fmI7ho", ["Faith"], { duration: "45:46" }),
  sermon("aj-wlG22Vd_mR0", "Dangerous Faith [New Assignments] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "wlG22Vd_mR0", ["Faith"], { duration: "32:01" }),
  sermon("aj-iJd7cw1bu0M", "Dangerous Faith [When God Is Moving] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "iJd7cw1bu0M", ["Faith"], { duration: "45:29" }),
  sermon("aj-DqpK5QGcu18", "Dangerous Faith | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "DqpK5QGcu18", ["Faith"], { duration: "51:43" }),
  sermon("aj-K1nNirjUVbY", "Living Hope: 250 Years of Praising the Father of Our Lord Jesus Christ [A Study of 1 Peter 1:3-9]", "Allen Jackson", "allen-jackson", "K1nNirjUVbY", ["Faith"], { duration: "48:13" }),
  sermon("aj-ciHcJK_0VKY", "Prayer & Judgment | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "ciHcJK_0VKY", ["Faith"], { duration: "43:12" }),
  sermon("aj-ChMwOd6weaY", "A Father\u2019s Faith [An Interview with Dr. George Jackson]", "Allen Jackson", "allen-jackson", "ChMwOd6weaY", ["Faith"], { duration: "40:31" }),
  sermon("aj-gcCEBakJ0Dg", "Our Heavenly Father | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "gcCEBakJ0Dg", ["Faith"], { duration: "48:36" }),
  sermon("aj-sB4ZFavWCtc", "Prayer and God\u2019s Power [Realms of Authority] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "sB4ZFavWCtc", ["Faith"], { duration: "44:16" }),
  sermon("aj-wpswrX2i_ss", "Prayer: Response to God\u2019s Discipline | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "wpswrX2i_ss", ["Faith"], { duration: "45:59" }),
  sermon("aj-T89e-DhvE2k", "Prayer and Spiritual Authority | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "T89e-DhvE2k", ["Faith"], { duration: "48:29" }),
  sermon("aj-N3P102mbHqM", "Identity & Redemption | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "N3P102mbHqM", ["Faith"], { duration: "46:39" }),
  sermon("aj-pP8XXBpJyJU", "Identity & Freedom | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "pP8XXBpJyJU", ["Faith"], { duration: "47:08" }),
  sermon("aj-Qq2C1X7b0OA", "Prayer and God\u2019s Power | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "Qq2C1X7b0OA", ["Faith"], { duration: "40:02" }),
  sermon("aj-UI-1vDOAAOU", "Expressions of God\u2019s Power | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "UI-1vDOAAOU", ["Faith"], { duration: "40:04" }),
  sermon("aj-BdvzpooH6bU", "Identity & Belonging | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "BdvzpooH6bU", ["Faith"], { duration: "42:04" }),
  sermon("aj-CVFOy6i2KK0", "Faith and Resiliency in our Armed Forces | Pastor Allen Interviews Chad Robichaux", "Allen Jackson", "allen-jackson", "CVFOy6i2KK0", ["Faith"], { duration: "45:59" }),
  sermon("aj-P6k3XwByz-Y", "Enlisted: AWOL or on Duty | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "P6k3XwByz-Y", ["Faith"], { duration: "45:52" }),
  sermon("aj-ElLVqVYnBQk", "Seasons of Great Change | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "ElLVqVYnBQk", ["Faith"], { duration: "47:45" }),
  sermon("aj-Db27UAy6NEM", "Lessons in Listening [The Voice of the King] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "Db27UAy6NEM", ["Faith"], { duration: "45:26" }),
  sermon("aj-kIh2caUd5Gw", "Murder, She Wrote | Pastor John Amanchukwu Sr.", "Allen Jackson", "allen-jackson", "kIh2caUd5Gw", ["Faith"], { duration: "47:21" }),
  sermon("aj-hIC-JV7l30Q", "Silent No More: The Call to Boldly Proclaim Christ [Pastor John Amanchukwu]", "Allen Jackson", "allen-jackson", "hIC-JV7l30Q", ["Faith"], { duration: "53:06" }),
  sermon("aj-5i-e6X7ctKQ", "When You're Up and When You're Down [A Study of Psalm 27, Part 2] | Pastor Robert J. Morgan", "Allen Jackson", "allen-jackson", "5i-e6X7ctKQ", ["Faith"], { duration: "53:01" }),
  sermon("aj-xqDb2f-y7D4", "When You're Up and When You're Down [A Study of Psalm 27, Part 1] | Pastor Robert J. Morgan", "Allen Jackson", "allen-jackson", "xqDb2f-y7D4", ["Faith"], { duration: "51:07" }),
  sermon("aj-bxxaKeNgZO8", "National Day of Prayer", "Allen Jackson", "allen-jackson", "bxxaKeNgZO8", ["Faith"], { duration: "39:00" }),
  sermon("aj-jPedj3g11AU", "World Outreach Church Kids Choir Presents Agape League | Spring Musical", "Allen Jackson", "allen-jackson", "jPedj3g11AU", ["Faith"], { duration: "47:03" }),
  sermon("aj-q1bHP4L9uSA", "Lessons in Listening [Generational Faith] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "q1bHP4L9uSA", ["Faith"], { duration: "52:42" }),
  sermon("aj-AL9iJhCbzS0", "Lessons in Listening | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "AL9iJhCbzS0", ["Faith"], { duration: "56:01" }),
  sermon("aj-d7bfYiHHBAE", "What is Ahead? [Lightning] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "d7bfYiHHBAE", ["Faith"], { duration: "56:11" }),
  sermon("aj-PJkUY7jEepU", "The Truth About Our Founding Fathers | Special Guest David Barton", "Allen Jackson", "allen-jackson", "PJkUY7jEepU", ["Faith"], { duration: "45:17" }),
  sermon("aj-QdNG_EeeHZI", "Draw Near to the Lord | Pastor George Jackson", "Allen Jackson", "allen-jackson", "QdNG_EeeHZI", ["Faith"], { duration: "50:13" }),
  sermon("aj-IolIjy816E4", "What is Ahead? [The Return of the King] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "IolIjy816E4", ["Faith"], { duration: "49:48" }),
  sermon("aj-r1VyrlDD_Yo", "What is Ahead? [A Conclusion; A Beginning] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "r1VyrlDD_Yo", ["Faith"], { duration: "53:00" }),
  sermon("aj-y8clKw-qawg", "What is Ahead? [Trouble and Triumph] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "y8clKw-qawg", ["Faith"], { duration: "50:09" }),
  sermon("aj-c7HBDYPMuO0", "Three Centurions [The Rest of the Story] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "c7HBDYPMuO0", ["Faith"], { duration: "52:29" }),
  sermon("aj-HAGyTgeT_vA", "Three Centurions [The Power to Change] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "HAGyTgeT_vA", ["Faith"], { duration: "43:33" }),
  sermon("aj-5jGVhSGrknE", "Three Centurions [The Power of Words] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "5jGVhSGrknE", ["Faith"], { duration: "49:33" }),
  sermon("aj-BirqO4ra-G8", "Three Centurions [The Power to Choose] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "BirqO4ra-G8", ["Faith"], { duration: "44:17" }),
  sermon("aj-PzjNWMcD1Lo", "Welcoming Jesus as Lord | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "PzjNWMcD1Lo", ["Faith"], { duration: "43:10" }),
  sermon("aj-MCSG6R2FUTc", "Choose Your Perspective | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "MCSG6R2FUTc", ["Faith"], { duration: "41:50" }),
  sermon("aj-f7Jp7ExErBY", "A Life of Service to the King [Easter 2026 Volunteer Service] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "f7Jp7ExErBY", ["Faith"], { duration: "38:35" }),
  sermon("aj-b3wOcAdsgcQ", "Lead with Faith [You Were Designed for This] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "b3wOcAdsgcQ", ["Faith"], { duration: "33:46" }),
  sermon("aj-qPNGuge-Pj4", "Finish the Race [Jesus' Victory on Display] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "qPNGuge-Pj4", ["Faith"], { duration: "47:55" }),
  sermon("aj-9UC5ICYiBDg", "Finish the Race [Jesus\u2019 Victory] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "9UC5ICYiBDg", ["Faith"], { duration: "51:22" }),
  sermon("aj-CiFOKf7s9R0", "Finish the Race [The Challenge of Faith] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "CiFOKf7s9R0", ["Faith"], { duration: "48:11" }),
  sermon("aj-ws9WGG68B6s", "Cover to Cover [Nehemiah] | Pastor Robert J. Morgan", "Allen Jackson", "allen-jackson", "ws9WGG68B6s", ["Faith"], { duration: "49:54" }),
  sermon("aj-5zUNdrZO1z8", "God Has Gifts for You [Powerful Gifts to Overcome an Adversary] | Pastor Allen Jackson", "Allen Jackson", "allen-jackson", "5zUNdrZO1z8", ["Faith"], { duration: "49:17" }),

  // Greg Laurie — 50 more, harvested from the official channel's own
  // uploads/sermon playlists and oEmbed-verified (channel + 200) on 2026-07-18.
  sermon("gl-eVPpBmvk07c", "The Refreshing Power of Revival | Bringing Hope to the Lost", "Greg Laurie", "harvest", "eVPpBmvk07c", ["Gospel"], { duration: "24:44" }),
  sermon("gl-o_EwYFiNRDw", "The Refreshing Power of Revival | Called to Share the Gospel", "Greg Laurie", "harvest", "o_EwYFiNRDw", ["Gospel"], { duration: "27:36" }),
  sermon("gl-hI5z34mK4Fc", "Getting Out Of The Christian Bubble | Greg Laurie", "Greg Laurie", "harvest", "hI5z34mK4Fc", ["Gospel"], { duration: "1:08:02" }),
  sermon("gl-WgZ3YzkvKec", "The Refreshment of the Spirit in Times of Trial | Shaped by God", "Greg Laurie", "harvest", "WgZ3YzkvKec", ["Gospel"], { duration: "26:29" }),
  sermon("gl-YYBF7H4ExhU", "Discipleship: The Next Step in Following Jesus | Growing Together in Faith", "Greg Laurie", "harvest", "YYBF7H4ExhU", ["Gospel"], { duration: "23:26" }),
  sermon("gl-VxA6srET-D4", "Discipleship: The Next Step in Following Jesus | Learning to Follow Jesus", "Greg Laurie", "harvest", "VxA6srET-D4", ["Gospel"], { duration: "26:12" }),
  sermon("gl-mxUD5XySDwQ", "The King the World Needs | Sunday Message", "Greg Laurie", "harvest", "mxUD5XySDwQ", ["Gospel"], { duration: "41:34" }),
  sermon("gl-Afq3sgSPnOA", "The Refreshment of the Spirit in Times of Trial | Finding Hope in God", "Greg Laurie", "harvest", "Afq3sgSPnOA", ["Gospel"], { duration: "27:23" }),
  sermon("gl-OCEaUCkWUtE", "The Refreshing Power of The Spirit-Filled Life | God Is Our Helper", "Greg Laurie", "harvest", "OCEaUCkWUtE", ["Gospel"], { duration: "26:20" }),
  sermon("gl-EcKt33WR8C8", "The Refreshing Power of The Spirit-Filled Life | Walking in the Spirit", "Greg Laurie", "harvest", "EcKt33WR8C8", ["Gospel"], { duration: "26:43" }),
  sermon("gl-GgDMLprJNPk", "The Refreshing Power of Prayer | Back to the Basics", "Greg Laurie", "harvest", "GgDMLprJNPk", ["Gospel"], { duration: "23:20" }),
  sermon("gl-GuXqR2Y2tLM", "The Refreshing Power of Prayer | God Is on the Throne", "Greg Laurie", "harvest", "GuXqR2Y2tLM", ["Gospel"], { duration: "25:09" }),
  sermon("gl-3VkUFTJvW3w", "Do Harvest Crusades Still Work in 2026?", "Greg Laurie", "harvest", "3VkUFTJvW3w", ["Gospel"], { duration: "20:05" }),
  sermon("gl-XeBJ2qcV2ms", "The Refreshing Power of Prayer | God Is Always Listening", "Greg Laurie", "harvest", "XeBJ2qcV2ms", ["Gospel"], { duration: "24:13" }),
  sermon("gl-mB5i-k4clVE", "God Keeps His Promises | Restoring the Fallen", "Greg Laurie", "harvest", "mB5i-k4clVE", ["Gospel"], { duration: "25:04" }),
  sermon("gl-8HC85rrP4b8", "Cast It, Don't Carry It: The Greek Word That Ends Sleepless Nights", "Greg Laurie", "harvest", "8HC85rrP4b8", ["Gospel"], { duration: "55:11" }),
  sermon("gl-GLXQjRX_A8Q", "God Keeps His Promises | Keeping God First", "Greg Laurie", "harvest", "GLXQjRX_A8Q", ["Gospel"], { duration: "23:20" }),
  sermon("gl-5m8Y0-Bxz_M", "God\u2019s Solution to Man\u2019s Problem | Leaving No Open Door", "Greg Laurie", "harvest", "5m8Y0-Bxz_M", ["Gospel"], { duration: "24:58" }),
  sermon("gl-W61h815ZI70", "God\u2019s Solution to Man\u2019s Problem | Where Sin Begins", "Greg Laurie", "harvest", "W61h815ZI70", ["Gospel"], { duration: "28:07" }),
  sermon("gl-mHrZQA-uwDA", "Interview with Marco Rubio: Harvest + Greg Laurie", "Greg Laurie", "harvest", "mHrZQA-uwDA", ["Gospel"], { duration: "27:31" }),
  sermon("gl-ZgGNagnrwSI", "Trouble in Paradise | How Satan Strikes", "Greg Laurie", "harvest", "ZgGNagnrwSI", ["Gospel"], { duration: "24:11" }),
  sermon("gl-4UcJMJli5Do", "Trouble in Paradise | Tracing Temptation", "Greg Laurie", "harvest", "4UcJMJli5Do", ["Gospel"], { duration: "23:09" }),
  sermon("gl-MnXgB7O-FUE", "Trouble in Paradise | Made by God", "Greg Laurie", "harvest", "MnXgB7O-FUE", ["Gospel"], { duration: "25:18" }),
  sermon("gl-_i5bEjNaKP0", "God\u2019s Purpose for Us | The Path of Purpose", "Greg Laurie", "harvest", "_i5bEjNaKP0", ["Gospel"], { duration: "23:59" }),
  sermon("gl-gtMcQXWKrmY", "\u201cHow To Be A Father When You Are Fatherless\u201d by Pastor Greg Laurie", "Greg Laurie", "harvest", "gtMcQXWKrmY", ["Gospel"], { duration: "1:15:39" }),
  sermon("gl-th-5H4oOuRc", "God\u2019s Purpose for Us | In the Beginning", "Greg Laurie", "harvest", "th-5H4oOuRc", ["Gospel"], { duration: "24:08" }),
  sermon("gl-S_g7z2fjRDg", "Don't Waste Your Life | Sunday Message", "Greg Laurie", "harvest", "S_g7z2fjRDg", ["Gospel"], { duration: "58:57" }),
  sermon("gl-nCNTyeRccnM", "Jesus and The Person Who Is Afraid: Harvest + Greg Laurie", "Greg Laurie", "harvest", "nCNTyeRccnM", ["Gospel"], { duration: "27:31" }),
  sermon("gl-NBlgv_3aYAI", "Don\u2019t Waste Your Life | Greg Laurie", "Greg Laurie", "harvest", "NBlgv_3aYAI", ["Gospel"], { duration: "58:19" }),
  sermon("gl-8PS06xBBXqk", "How to Be a Father When You are Fatherless | Leading by Living", "Greg Laurie", "harvest", "8PS06xBBXqk", ["Gospel"], { duration: "27:13" }),
  sermon("gl-sJJTWVjCinE", "How to Be a Father When You are Fatherless | The Father Who Stays", "Greg Laurie", "harvest", "sJJTWVjCinE", ["Gospel"], { duration: "25:50" }),
  sermon("gl-8SfucO-ouCQ", "Debunking the Founding Fathers | Greg Laurie & Eric Metaxas", "Greg Laurie", "harvest", "8SfucO-ouCQ", ["Gospel"], { duration: "1:12:52" }),
  sermon("gl-PvcWLSh2c_U", "The Writing Is On the Wall | Too Late to Turn Back", "Greg Laurie", "harvest", "PvcWLSh2c_U", ["Gospel"], { duration: "25:34" }),
  sermon("gl-_xPrWDsD5mU", "The Writing Is On the Wall | Immovable Faith", "Greg Laurie", "harvest", "_xPrWDsD5mU", ["Gospel"], { duration: "26:38" }),
  sermon("gl-a5J4dt1Wcsg", "P.S. I Love You | Standing on the Solid Rock", "Greg Laurie", "harvest", "a5J4dt1Wcsg", ["Gospel"], { duration: "26:48" }),
  sermon("gl-PagBhjMPknI", "\u201cDon\u2019t Waste Your Life\u201d by Pastor Greg Laurie", "Greg Laurie", "harvest", "PagBhjMPknI", ["Gospel"], { duration: "1:24:55" }),
  sermon("gl-7PiyBjy6d4w", "Don't Carry What God Can Handle | Sunday Message", "Greg Laurie", "harvest", "7PiyBjy6d4w", ["Gospel"], { duration: "43:49" }),
  sermon("gl-3aGIJUr5V-k", "Wrestling with GOD: Harvest + Greg Laurie", "Greg Laurie", "harvest", "3aGIJUr5V-k", ["Gospel"], { duration: "27:31" }),
  sermon("gl-IctzYs16Gvo", "P.S. I Love You | Compassion at the Core", "Greg Laurie", "harvest", "IctzYs16Gvo", ["Gospel"], { duration: "24:38" }),
  sermon("gl-gdYfkJARdcY", "Are You Carrying Burdens Not Meant for You? | Greg Laurie", "Greg Laurie", "harvest", "gdYfkJARdcY", ["Gospel"], { duration: "49:31" }),
  sermon("gl-Ygd8X-Bx0tA", "When Love Moves In, Fear Moves Out | Love That Brings Us Home", "Greg Laurie", "harvest", "Ygd8X-Bx0tA", ["Gospel"], { duration: "24:56" }),
  sermon("gl-P_lrtcOgCm4", "When Love Moves In, Fear Moves Out | Spotting Spiritual Scams", "Greg Laurie", "harvest", "P_lrtcOgCm4", ["Gospel"], { duration: "26:43" }),
  sermon("gl-62mJLW12FEU", "Overcoming the Great Deceiver: Truth in a World of Fakes | Forgiven and Free", "Greg Laurie", "harvest", "62mJLW12FEU", ["Gospel"], { duration: "24:06" }),
  sermon("gl-DovbNlEaS3s", "Overcoming the Great Deceiver: Truth in a World of Fakes | Fighting From Victory", "Greg Laurie", "harvest", "DovbNlEaS3s", ["Gospel"], { duration: "23:19" }),
  sermon("gl-dscSSivdrT0", "Packing for Eternity | Sunday Message (Pastor Jonathan Laurie)", "Greg Laurie", "harvest", "dscSSivdrT0", ["Gospel"], { duration: "49:15" }),
  sermon("gl-8q_qus8XBmA", "GOD IS NOW HERE : Harvest + Greg Laurie", "Greg Laurie", "harvest", "8q_qus8XBmA", ["Gospel"], { duration: "27:31" }),
  sermon("gl-uYs4pRkP494", "Overcoming the Great Deceiver: Truth in a World of Fakes | Seeing Through the Lies", "Greg Laurie", "harvest", "uYs4pRkP494", ["Gospel"], { duration: "26:33" }),
  sermon("gl-jYYQCOTEV10", "Signs of The Last Days & Why You Shouldn\u2019t Panic | If Today Were the Day", "Greg Laurie", "harvest", "jYYQCOTEV10", ["Gospel"], { duration: "23:48" }),
  sermon("gl-wZAP6NG1ILE", "Signs of The Last Days & Why You Shouldn\u2019t Panic | Your Future Is Secure", "Greg Laurie", "harvest", "wZAP6NG1ILE", ["Gospel"], { duration: "26:02" }),
  sermon("gl-hPOJ_XXT8Ac", "Unshakeable: When Faith Feels Fragile | Cleansed Completely", "Greg Laurie", "harvest", "hPOJ_XXT8Ac", ["Gospel"], { duration: "24:37" }),
];

// ---------------------------------------------------------------------------
// MUSIC VIDEOS — official artist/label uploads. Kept separate from Music
// to preserve distinct browsing experience.
// ---------------------------------------------------------------------------
const MUSIC_VIDEOS: MediaItem[] = [
  // Existing music videos are already marked in MUSIC
  // and also appear in musicVideos() helper. This section is for
  // music-video-primary entries (official lyric videos, live sessions, etc.)
  // that are distinct from the studio recordings.
];

// ---------------------------------------------------------------------------
// EXPANDED APPROVED ARTIST CATALOG — recordings harvested from official
// channels. All entries default to ownerReviewed: false in djMoodReview.ts
// and are excluded from mood recommendations until owner reviews them
// individually (P0 mood-integrity protection).
// ---------------------------------------------------------------------------
const EXPANDED_MUSIC: MediaItem[] = [
  // Approved-artist catalog expansion (53 verified official recordings)
  // All entries verified via oEmbed (official channel, working videoId, correct title)
  // All have review entries in djMoodReview.ts with ownerReviewed: false

  // All Sons & Daughters (5 new)
  song("song-asd-greatareyoulord", "Great Are You Lord", "All Sons & Daughters", "hpb02shcAis", ["Worship", "Gospel"], { summary: "A declaration of God's greatness." }),
  song("song-asd-restinyou", "Rest In You", "All Sons & Daughters", "mVKjCKYSGT4", ["Peace", "Hope"], { summary: "Finding rest in His promises." }),
  song("song-asd-youholditall", "You Hold It All Together", "All Sons & Daughters", "PkalShCfEi8", ["Worship", "Gospel"], { summary: "Everything holds together in Him." }),
  song("song-asd-calledmehigher", "Called Me Higher", "All Sons & Daughters", "FgAzLKXqcDk", ["Hope", "Faith"], { summary: "Called to something greater." }),
  song("song-asd-ohhowineedy", "Oh How I Need You", "All Sons & Daughters", "j-ZpcJzGBpE", ["Worship", "Prayer"], { summary: "A cry of deepest need met by His presence." }),

  // Anne Wilson (2 new)
  song("song-annewilson-godstory", "God Story", "Anne Wilson", "3lk_9IbmDQs", ["Gospel", "Hope"], { summary: "Your testimony matters in His story." }),
  song("song-annewilson-songsaboutwhiskey", "Songs About Whiskey", "Anne Wilson", "6JIPU4crP7k", ["Gospel", "Hope"], { summary: "From whiskey to worship — the transformation." }),

  // CAIN (4 new)
  song("song-cain-friendinjesus", "Friend in Jesus", "CAIN", "_1D5C0kid2g", ["Gospel", "Joy"], { summary: "Jesus, our greatest friend." }),
  song("song-cain-windowsdown", "Windows Down", "CAIN", "4qrMMS7bFSk", ["Joy", "Worship"], { summary: "Celebrating with freedom." }),
  song("song-cain-thecommission", "The Commission", "CAIN", "APATH3ea-D0", ["Gospel", "Faith"], { summary: "Go and make disciples — the mission." }),
  song("song-cain-friendinjesuslive", "Friend In Jesus (Live)", "CAIN", "CwWOWgmdcxY", ["Gospel", "Joy"], { summary: "Live from the heart." }),

  // Casting Crowns (1 new - who am i removed as duplicate)
  song("song-cc-nobody", "Nobody", "Casting Crowns", "1yBzIt_z8oY", ["Gospel", "Hope"], { summary: "When you feel overlooked, you are somebody to Him." }),

  // Chris Tomlin (2 new)
  song("song-christomlin-iwillfollow", "I Will Follow", "Chris Tomlin", "1ohvhmGSfxI", ["Gospel", "Worship"], { summary: "Complete surrender to follow Jesus." }),
  song("song-christomlin-howgooditx", "How Good It Is", "Chris Tomlin", "3dnzv6cCmH8", ["Gospel", "Joy"], { summary: "The sweetness of God's presence together." }),

  // Forrest Frank (2 new)
  song("song-forrestfrank-celebration", "CELEBRATION", "Forrest Frank", "1I2AMD12FTE", ["Joy", "Gospel"], { summary: "Jubilation in Christ." }),
  song("song-forrestfrank-jesusisalive", "JESUS IS ALIVE", "Forrest Frank", "6tmU5b3iPUg", ["Gospel", "Hope"], { summary: "The victory cry of resurrection." }),

  // for KING & COUNTRY (1 new)
  song("song-fkc-whatifitoldyou", "what if i told you", "for KING & COUNTRY", "4TtDlYiUF9s", ["Gospel", "Hope"], { summary: "What if the Gospel story changed everything?" }),

  // Lauren Daigle (2 new)
  song("song-laurendaigle-thankgodiido", "Thank God I Do", "Lauren Daigle", "1U0wAhq2tg4", ["Joy", "Gospel"], { summary: "Grateful for His faithfulness." }),
  song("song-laurendaigle-ouleadme", "You Lead Me", "Lauren Daigle", "5xwQFjx5Er8", ["Peace", "Faith"], { summary: "Following where He leads." }),

  // Leeland (7 new)
  song("song-leeland-yourenotdone", "You're Not Done", "Leeland", "1f89ySw7hUc", ["Gospel", "Hope"], { summary: "His work in us continues." }),
  song("song-leeland-stillmighty", "Still Mighty", "Leeland", "1rucdIEgitU", ["Faith", "Gospel"], { summary: "His power is not diminished." }),
  song("song-leeland-waymakerlyr", "Way Maker", "Leeland", "29IxnsqOkmQ", ["Hope", "Worship"], { summary: "He makes a way where there is none." }),
  song("song-leeland-whereyouare", "Where You Are", "Leeland", "3-zVfM9SJQA", ["Peace", "Prayer"], { summary: "Seeking His presence in every place." }),
  song("song-leeland-followyou", "Follow You", "Leeland", "4ajIFfSaEzE", ["Gospel", "Faith"], { summary: "Single-hearted devotion to Jesus." }),
  song("song-leeland-rain", "Rain", "Leeland", "AaTOcRsaUpk", ["Peace", "Hope"], { summary: "Refreshment in the storms of life." }),
  song("song-leeland-lionandthelamb", "Lion And The Lamb", "Leeland", "C9ujBoud26k", ["Gospel", "Worship"], { summary: "The power and gentleness of Christ." }),

  // Matthew West (3 new)
  song("song-mwest-meonyourmind", "Me on Your Mind", "Matthew West", "5sNbahy6UCc", ["Gospel", "Peace"], { summary: "Knowing His thoughts toward us are countless." }),
  song("song-mwest-dontstoppraying", "Don't Stop Praying", "Matthew West", "8r0eA49MZ0w", ["Prayer", "Faith"], { summary: "Persistence in prayer changes everything." }),
  song("song-mwest-good", "Good", "Matthew West", "BquLbLcwrZU", ["Gospel", "Hope"], { summary: "In His hands, all things work for good." }),

  // MercyMe (2 new)
  song("song-mercyme-makeitwell", "Make It Well", "MercyMe", "3wnzzOpqzdk", ["Peace", "Hope"], { summary: "Peace in the midst of life's chaos." }),
  song("song-mercyme-ohdeath", "Oh Death", "MercyMe", "4m2Ld4CJfZA", ["Gospel", "Hope"], { summary: "Victory over death through Christ." }),

  // Newsboys (2 new)
  song("song-newsboys-entertainingangels", "Entertaining Angels", "Newsboys", "1YH4UQb_VlE", ["Gospel", "Joy"], { summary: "Hospitality and kindness as worship." }),
  song("song-newsboys-shine", "Shine", "Newsboys", "5gl1xu1wCN4", ["Gospel", "Hope"], { summary: "Let your light shine in the darkness." }),

  // Phil Wickham (2 new)
  song("song-pw-fearhasnopower", "Fear Has No Power", "Phil Wickham", "1UtLVQtJRLU", ["Faith", "Peace"], { summary: "Fear loses its grip when faith takes over." }),
  song("song-pw-cornerstone", "Cornerstone", "Phil Wickham", "3dPgO0nmc2Y", ["Gospel", "Faith"], { summary: "Jesus, our solid foundation." }),

  // Reawaken Hymns (4 new - blessed assurance removed as duplicate)
  song("hymn-bethoutmyvision-raw", "Be Thou My Vision", "Reawaken Hymns", "76_XJmvnNVE", ["Hymns", "Worship"], { summary: "Focus on Jesus above all things." }),
  song("hymn-nothingbuttheblood-raw", "Nothing but the Blood", "Reawaken Hymns", "8QH5lpYSBpI", ["Hymns", "Gospel"], { summary: "The power of the blood of Christ." }),
  song("hymn-whatafriendwehave-raw", "What a Friend We Have in Jesus", "Reawaken Hymns", "9mv8SQfJxRk", ["Hymns", "Prayer"], { summary: "Jesus, our faithful friend and intercessor." }),
  song("hymn-thisismyfatthersworld-raw", "This Is My Father's World", "Reawaken Hymns", "EMAsxu_HwaA", ["Hymns", "Gospel"], { summary: "Assurance in God's sovereignty over all creation." }),

  // Seph Schlueter (4 new - counting my blessings removed as duplicate)
  song("song-seph-runningbacktoyou", "Running Back To You", "Seph Schlueter", "3PDnaKH4_i0", ["Gospel", "Hope"], { summary: "Always finding our way back to Him." }),
  song("song-seph-turnittoproaise", "Turn It To Praise", "Seph Schlueter", "8EPGgJPB-Ls", ["Worship", "Gospel"], { summary: "Transforming struggles into worship." }),
  song("song-seph-lovemestill", "Love Me Still", "Seph Schlueter", "bRoAKzSFaLc", ["Gospel", "Hope"], { summary: "Unconditional love in Christ." }),
  song("song-seph-stay", "Stay", "Seph Schlueter", "Egt-pQY0oeY", ["Gospel", "Peace"], { summary: "His faithfulness will never leave us." }),

  // Shane & Shane (2 new)
  song("song-shaneandshane-comeтhonfont", "Come Thou Fount", "Shane & Shane", "3bvYJL6WhuY", ["Hymns", "Prayer"], { summary: "Ancient prayer of praise and thanksgiving." }),
  song("song-shaneandshane-thelordismysalv", "The Lord Is My Salvation", "Shane & Shane", "AFkGH64pMMw", ["Gospel", "Faith"], { summary: "Complete reliance on His deliverance." }),

  // We The Kingdom (2 new)
  song("song-wtk-rescueme", "Rescue Me", "We The Kingdom", "_52knMLxbew", ["Gospel", "Hope"], { summary: "Cry for salvation and rescue from sin." }),
  song("song-wtk-donttreadonme", "Don't Tread On Me", "We The Kingdom", "9dowS2k2TS4", ["Gospel", "Faith"], { summary: "Standing firm in Christ's protection." }),

  // Zach Williams (no new - fear is a liar is duplicate)
];

export const LIBRARY: MediaItem[] = [...MUSIC, ...EXPANDED_MUSIC, ...MUSIC_VIDEOS, ...PLAYLISTS, ...PODCASTS, ...SERMONS, ...BULK_SERMONS];

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

// musicVideos() removed — playbackExperience now distinguishes listen from watch

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

// --- Browsing and filtering helpers ---

// All unique artists in the library (normalized lowercase for comparison).
export function allArtists(items: MediaItem[] = LIBRARY): string[] {
  const artists = new Set<string>();
  for (const item of activeItems(items)) {
    artists.add(item.author);
  }
  return Array.from(artists).sort();
}

// Filter items by artist (case-insensitive match).
export function itemsByArtist(artist: string, items: MediaItem[] = LIBRARY): MediaItem[] {
  const lower = artist.toLowerCase();
  return activeItems(items).filter((i) => i.author.toLowerCase() === lower);
}

// Search items by title (substring match, case-insensitive).
export function searchByTitle(query: string, items: MediaItem[] = LIBRARY): MediaItem[] {
  const lower = query.toLowerCase();
  return activeItems(items).filter((i) => i.title.toLowerCase().includes(lower));
}
