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

export const FAITH_THEMES: FaithTheme[] = [
  {
    key: "praise",
    label: "Praise",
    emoji: "🙌",
    blurb: "Lift it up — songs that put God first and the volume high.",
    videos: [
      { title: "What a Beautiful Name", artist: "Hillsong Worship", youtubeId: "nQWFzMvCfLE" },
      { title: "King of Kings", artist: "Hillsong Worship", youtubeId: "dQl4izxPeNU" },
      { title: "Graves Into Gardens", artist: "Elevation Worship", youtubeId: "KwX1f2gYKZ4" },
    ],
  },
  {
    key: "hope",
    label: "Hope",
    emoji: "🌅",
    blurb: "For the waiting seasons — He is still making a way.",
    videos: [
      { title: "Way Maker", artist: "Leeland", youtubeId: "iJCV_2H9xD0" },
      { title: "Same God", artist: "Elevation Worship", youtubeId: "LawxIZE9ePE" },
      { title: "I Can Only Imagine", artist: "MercyMe", youtubeId: "N_lrrq_opng" },
    ],
  },
  {
    key: "faith",
    label: "Faith & Trust",
    emoji: "✝️",
    blurb: "When you can't see it yet — trust Him anyway.",
    videos: [
      { title: "Goodness of God", artist: "Bethel Music / Jenn Johnson", youtubeId: "n0FBb6hnwTo" },
      { title: "Even If", artist: "MercyMe", youtubeId: "B6fA35Ved-Y" },
    ],
  },
  {
    key: "joy",
    label: "Joy & Gratitude",
    emoji: "😊",
    blurb: "Thankful songs to reset your whole day.",
    videos: [
      { title: "Gratitude", artist: "Brandon Lake", youtubeId: "dQdfs5S6jyA" },
      { title: "Holy Water", artist: "We The Kingdom", youtubeId: "7KLQ2AXQmtA" },
    ],
  },
  {
    key: "peace",
    label: "Peace over Fear",
    emoji: "🕊️",
    blurb: "For anxious hearts — He is all around you.",
    videos: [
      { title: "Christ Be All Around Me", artist: "All Sons & Daughters", youtubeId: "cmge-ycIkoo" },
    ],
  },
];
