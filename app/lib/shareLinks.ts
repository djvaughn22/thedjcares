// Share links — one small utility behind every Share button on the site.
//
// Every deep link is a query param on the homepage, so the existing player
// architecture stays exactly as it is:
//   /?play=<media-id>   → cue that song / video / sermon / podcast / playlist
//   /?ministry=<key>    → open the Ministries tab at that ministry
//   /?church=<id>       → open the Churches tab at that church
// This feature shares links only — never images, files, or generated cards.

import {
  activeItems,
  APPROVED_CHURCHES,
  MINISTRIES,
  type ApprovedChurch,
  type MediaItem,
  type Ministry,
} from "./djCaresLibrary";

// Never permanently share localhost or preview-deployment URLs.
export const PRODUCTION_ORIGIN = "https://thedjcares.com";

export type ShareTarget = {
  id: string;
  title: string;
  /** Plain label people see: "Song", "Sermon", "Playlist", "Ministry"… */
  contentType: string;
  /** Query string that deep-links to the exact item, e.g. "?play=song-way-maker". */
  query: string;
};

export function mediaTypeLabel(item: MediaItem): string {
  if (item.type === "music") return item.musicVideo ? "Music Video" : "Song";
  if (item.type === "podcast") return "Podcast";
  if (item.type === "sermon") return "Sermon";
  return "Playlist";
}

export function mediaShareTarget(item: MediaItem): ShareTarget {
  return {
    id: item.id,
    title: item.title,
    contentType: mediaTypeLabel(item),
    query: `?play=${encodeURIComponent(item.id)}`,
  };
}

export function ministryShareTarget(m: Ministry): ShareTarget {
  return {
    id: m.key,
    title: m.name,
    contentType: "Ministry",
    query: `?ministry=${encodeURIComponent(m.key)}`,
  };
}

export function churchShareTarget(c: ApprovedChurch): ShareTarget {
  return {
    id: c.id,
    title: c.name,
    contentType: "Church",
    query: `?church=${encodeURIComponent(c.id)}`,
  };
}

// --- deep-link resolvers (benched items stay unlisted, so they don't resolve) --

export function findShareMedia(id: string): MediaItem | undefined {
  return activeItems().find((i) => i.id === id);
}

export function findShareMinistry(key: string): Ministry | undefined {
  return MINISTRIES.find((m) => m.key === key);
}

export function findShareChurch(id: string): ApprovedChurch | undefined {
  return APPROVED_CHURCHES.find((c) => c.id === id);
}

// --- URL + message builders ------------------------------------------------

// The live site's own origin when we're on it; the production domain
// everywhere else (localhost, previews, server-side).
export function shareOrigin(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "thedjcares.com" || host === "www.thedjcares.com") return window.location.origin;
  }
  return PRODUCTION_ORIGIN;
}

export function shareUrl(target: ShareTarget, origin: string = shareOrigin()): string {
  return `${origin}/${target.query}`;
}

const VERBS: Record<string, string> = {
  Song: "Listen to",
  Playlist: "Listen to",
  Podcast: "Listen to",
  "Music Video": "Watch",
  Sermon: "Watch",
  Church: "Watch",
  Ministry: "Check out",
};

export function shareVerb(target: ShareTarget): string {
  return VERBS[target.contentType] ?? "Check out";
}

// Songs and music videos speak for themselves; everything else says what it is.
function titleWithType(target: ShareTarget): string {
  const plain = target.contentType === "Song" || target.contentType === "Music Video";
  return plain ? `“${target.title}”` : `“${target.title}” (${target.contentType.toLowerCase()})`;
}

export function shareMessage(target: ShareTarget, url: string = shareUrl(target)): string {
  return `${shareVerb(target)} ${titleWithType(target)} on The DJ Cares:\n${url}`;
}

export function emailSubject(target: ShareTarget): string {
  return `${shareVerb(target)} “${target.title}” on The DJ Cares`;
}

export function emailBody(target: ShareTarget, url: string = shareUrl(target)): string {
  return `I thought you might like this:\n\n${target.title}\n${url}\n`;
}

// encodeURIComponent leaves apostrophes raw; some SMS handlers choke on them,
// so encode those too (titles like "Bob's" are common).
const enc = (s: string) => encodeURIComponent(s).replace(/'/g, "%27");

// `sms:?&body=` is the cross-platform form (iOS and Android both accept it).
export function smsHref(target: ShareTarget, url: string = shareUrl(target)): string {
  return `sms:?&body=${enc(shareMessage(target, url))}`;
}

export function emailHref(target: ShareTarget, url: string = shareUrl(target)): string {
  return `mailto:?subject=${enc(emailSubject(target))}&body=${enc(emailBody(target, url))}`;
}
