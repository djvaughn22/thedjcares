// Faith Playlist → YouTube video collection, organized by theme/mood.
//
// TWO WAYS TO FILL A THEME (best practice first):
//  1. playlistId  — paste a YouTube PLAYLIST id (starts with "PL...") you curate
//     in your own YouTube account. The whole themed playlist embeds and plays in
//     order. This is the scalable, dead-ID-proof way for the full 147-song list.
//  2. videos[]    — a small hand-picked set of individual videos. Every id here
//     was verified live via YouTube oEmbed (200 + matching title). Add more with
//     one line each, but verify first:
//       curl -s -o /dev/null -w "%{http_code}" \
//         "https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DID&format=json"

export type FaithVideo = { title: string; artist: string; youtubeId: string };

export type FaithTheme = {
  key: string;
  label: string;
  emoji: string;
  blurb: string;
  playlistId?: string; // optional YouTube playlist id (PL...) — embeds the whole themed list
  videos: FaithVideo[];
};

// Only clean, non-controversial songs from official artist channels. Every id
// below was verified live via YouTube oEmbed (200 + matching official title).
export const FAITH_THEMES: FaithTheme[] = [
  {
    key: "grace",
    label: "Praise & Grace",
    emoji: "🙌",
    blurb: "Lift it up — the wonder of grace and who God is.",
    videos: [
      { title: "This Is Amazing Grace", artist: "Phil Wickham", youtubeId: "XFRjr_x-yxU" },
      { title: "Amazing Grace (My Chains Are Gone)", artist: "Chris Tomlin", youtubeId: "Y-4NFvI5U9w" },
      { title: "We Believe", artist: "Newsboys", youtubeId: "WjZ01FcK0yk" },
      { title: "Battle Belongs", artist: "Phil Wickham", youtubeId: "qtvQNzPHn-w" },
    ],
  },
  {
    key: "hope",
    label: "Hope",
    emoji: "🌅",
    blurb: "For the waiting seasons — He is still making a way.",
    videos: [
      { title: "Living Hope", artist: "Phil Wickham", youtubeId: "u-1fwZtKJSM" },
      { title: "Way Maker", artist: "Leeland", youtubeId: "iJCV_2H9xD0" },
      { title: "I Can Only Imagine", artist: "MercyMe", youtubeId: "N_lrrq_opng" },
      { title: "Rise Up (Lazarus)", artist: "CAIN", youtubeId: "8RIZlNYl4ok" },
    ],
  },
  {
    key: "faith",
    label: "Faith & Trust",
    emoji: "✝️",
    blurb: "When you can't see it yet — trust Him anyway.",
    videos: [
      { title: "Even If", artist: "MercyMe", youtubeId: "B6fA35Ved-Y" },
      { title: "Praise You in This Storm", artist: "Casting Crowns", youtubeId: "0YUGwUgBvTU" },
      { title: "My Jesus", artist: "Anne Wilson", youtubeId: "FW5o2uBeMWQ" },
      { title: "Just Be Held", artist: "Casting Crowns", youtubeId: "tIZitK6_IMQ" },
    ],
  },
  {
    key: "freedom",
    label: "Freedom & Breakthrough",
    emoji: "⛓️",
    blurb: "Chains fall, fear loses — He breaks what holds you.",
    videos: [
      { title: "Chain Breaker", artist: "Zach Williams", youtubeId: "cd_xxmXdQz4" },
      { title: "Fear Is a Liar", artist: "Zach Williams", youtubeId: "1srs1YoTVzs" },
      { title: "Who Am I", artist: "Casting Crowns", youtubeId: "C53GgUJ6y-Y" },
      { title: "Rescue Story", artist: "Zach Williams", youtubeId: "Q3aP5iuJITg" },
    ],
  },
  {
    key: "peace",
    label: "Peace over Fear",
    emoji: "🕊️",
    blurb: "For anxious hearts — He stays, and He is near.",
    videos: [
      { title: "The God Who Stays", artist: "Matthew West", youtubeId: "QPwd_TQpsHY" },
      { title: "You Say", artist: "Lauren Daigle", youtubeId: "sIaT8Jl2zpI" },
      { title: "Christ Be All Around Me", artist: "All Sons & Daughters", youtubeId: "cmge-ycIkoo" },
      { title: "Scars in Heaven", artist: "Casting Crowns", youtubeId: "qCdevloDE6E" },
    ],
  },
  {
    key: "joy",
    label: "Joy & Gratitude",
    emoji: "😊",
    blurb: "Thankful songs to reset your whole day.",
    videos: [
      { title: "Holy Water", artist: "We The Kingdom", youtubeId: "7KLQ2AXQmtA" },
      { title: "GOOD DAY", artist: "Forrest Frank", youtubeId: "eO7-9WzLDZo" },
      { title: "joy.", artist: "for KING & COUNTRY", youtubeId: "lA7n7TwPDmw" },
      { title: "Counting My Blessings", artist: "Seph Schlueter", youtubeId: "aZjWYgq9QfM" },
    ],
  },
];
