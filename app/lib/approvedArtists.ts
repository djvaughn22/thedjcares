// Approved artist registry for TheDJCares catalog expansion.
//
// These artists are approved to have their broader official catalogs added
// to Music, Music Videos, and browsing. This registry documents:
// - Where the approval came from (existing catalog entries, Faith playlist, etc.)
// - Artist aliases and YouTube channels for harvesting
// - Current status of catalog coverage
//
// IMPORTANT: Artist approval does not automatically approve individual
// recordings for mood recommendations. Each new recording must be evaluated
// separately in djMoodReview.ts before appearing in Digital DJ moods
// (see the P0 mood-integrity fix, Jul 22 2026).

export type ApprovedArtist = {
  id: string; // kebab-case internal ID, e.g. "chris-tomlin"
  name: string; // Official artist name
  aliases?: string[]; // alternate names (e.g., "for KING & COUNTRY" might be "for king and country")
  approved: true;
  approvalSources: Array<
    | "existing_music_catalog"
    | "existing_video_catalog"
    | "owner_explicit"
  >;
  youtubeChannels?: string[]; // Official channel URLs for harvesting
  spotifyId?: string; // For reference
  verified: string; // When this approval was last confirmed
  note?: string; // Context on the approval
};

export const APPROVED_ARTISTS: Record<string, ApprovedArtist> = {
  "chris-tomlin": {
    id: "chris-tomlin",
    name: "Chris Tomlin",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@christomlinmusic"],
    verified: "2026-07-22",
  },
  "casting-crowns": {
    id: "casting-crowns",
    name: "Casting Crowns",
    approved: true,
    approvalSources: ["existing_music_catalog", "existing_video_catalog"],
    youtubeChannels: ["https://www.youtube.com/@castingcrownsofficial"],
    verified: "2026-07-22",
  },
  "mercy-me": {
    id: "mercy-me",
    name: "MercyMe",
    approved: true,
    approvalSources: ["existing_music_catalog", "existing_video_catalog"],
    youtubeChannels: ["https://www.youtube.com/@mercymeofficial"],
    verified: "2026-07-22",
  },
  "phil-wickham": {
    id: "phil-wickham",
    name: "Phil Wickham",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@philwickhammusic"],
    verified: "2026-07-22",
  },
  "for-king-and-country": {
    id: "for-king-and-country",
    name: "for KING & COUNTRY",
    aliases: ["for king and country"],
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@forkingandcountry"],
    verified: "2026-07-22",
  },
  "newsboys": {
    id: "newsboys",
    name: "Newsboys",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@newsboysofficial"],
    verified: "2026-07-22",
  },
  "zach-williams": {
    id: "zach-williams",
    name: "Zach Williams",
    approved: true,
    approvalSources: ["existing_music_catalog", "existing_video_catalog"],
    youtubeChannels: ["https://www.youtube.com/@zachwilliamsmusic"],
    verified: "2026-07-22",
  },
  "matthewwest": {
    id: "matthew-west",
    name: "Matthew West",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@matthewwestmusic"],
    verified: "2026-07-22",
  },
  "leeland": {
    id: "leeland",
    name: "Leeland",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@leelandmusic"],
    verified: "2026-07-22",
  },
  "lauren-daigle": {
    id: "lauren-daigle",
    name: "Lauren Daigle",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@laurendaigle"],
    verified: "2026-07-22",
  },
  "cain": {
    id: "cain",
    name: "CAIN",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@cainmusic"],
    verified: "2026-07-22",
  },
  "we-the-kingdom": {
    id: "we-the-kingdom",
    name: "We The Kingdom",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@wethekingdom"],
    verified: "2026-07-22",
  },
  "all-sons-and-daughters": {
    id: "all-sons-and-daughters",
    name: "All Sons & Daughters",
    aliases: ["All Sons and Daughters"],
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@allsonsanddaughters"],
    verified: "2026-07-22",
  },
  "shane-and-shane": {
    id: "shane-and-shane",
    name: "Shane & Shane",
    aliases: ["Shane Barnard & Shane Everett"],
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@shaneandshane"],
    verified: "2026-07-22",
  },
  "anne-wilson": {
    id: "anne-wilson",
    name: "Anne Wilson",
    approved: true,
    approvalSources: ["existing_music_catalog", "existing_video_catalog"],
    youtubeChannels: ["https://www.youtube.com/@anneWilsonmusic"],
    verified: "2026-07-22",
  },
  "reawaken-hymns": {
    id: "reawaken-hymns",
    name: "Reawaken Hymns",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@reawakenhymns"],
    verified: "2026-07-22",
  },
  "forrest-frank": {
    id: "forrest-frank",
    name: "Forrest Frank",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@forrestfrank"],
    verified: "2026-07-22",
  },
  "seph-schlueter": {
    id: "seph-schlueter",
    name: "Seph Schlueter",
    approved: true,
    approvalSources: ["existing_music_catalog"],
    youtubeChannels: ["https://www.youtube.com/@sephschlueter"],
    verified: "2026-07-22",
  },
  "dolly-parton": {
    id: "dolly-parton",
    name: "Dolly Parton",
    approved: true,
    approvalSources: ["existing_video_catalog"],
    youtubeChannels: ["https://www.youtube.com/@dollyparton"],
    verified: "2026-07-22",
    note: "Approved via 'There Was Jesus' (feat. Zach Williams). Gospel/Faith focus only.",
  },
};

export function isApprovedArtist(artistName: string): boolean {
  const lower = artistName.toLowerCase();
  return Object.values(APPROVED_ARTISTS).some(
    (a) =>
      a.name.toLowerCase() === lower ||
      a.aliases?.some((alias) => alias.toLowerCase() === lower),
  );
}

export function getApprovedArtist(artistName: string): ApprovedArtist | null {
  const lower = artistName.toLowerCase();
  return (
    Object.values(APPROVED_ARTISTS).find(
      (a) =>
        a.name.toLowerCase() === lower ||
        a.aliases?.some((alias) => alias.toLowerCase() === lower),
    ) ?? null
  );
}
