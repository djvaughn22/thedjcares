// ============================================================================
// OPEN MIRROR DAILY SOCIAL ENGINE — core (brand-agnostic)
// Canonical copy: open-mirror/packages/daily-social-engine/
// Synced into each site's lib — NEVER edit the site copies directly.
//
// One engine, many brands: a brand is a DailySocialBrandConfig plus one
// content adapter that returns a DailySocialPost for a date. Everything else
// (dates, captions, validation, publishing, admin) is shared. Built to scale
// to hundreds of brands: adding one = config + adapter + card design.
//
// TIMEZONE DECISION: every Open Mirror daily product runs on America/Chicago.
// A "day" begins at midnight Central; the YYYY-MM-DD date key is the
// deterministic seed for that day's content.
// ============================================================================

export const DAILY_SOCIAL_TIMEZONE = "America/Chicago";

export type DailySocialBrandConfig = {
  brand: string; // machine key, e.g. "crossheartpray"
  siteName: string; // e.g. "CrossHeartPray.com"
  siteUrl: string; // canonical origin, e.g. "https://crossheartpray.com"
  markerPrefix: string; // first caption line prefix + duplicate-ledger marker
  hashtags: string[]; // small, intentional set — no stuffing
  startDate: string; // first public daily post (YYYY-MM-DD)
  version: number; // bump to intentionally change rendering for same data
};

export type DailySocialPost = {
  brand: string;
  date: string;
  fullDate: string;
  timezone: string;
  version: number;
  contentId: string; // stable id of the featured item (board id, dog id, library id)
  typeLabel: string; // e.g. "Daily Bible Bingo", "Dog of the Day", "Song for Today"
  title: string;
  caption: string;
  hashtags: string[];
  imagePath: string; // site-relative stable PNG path Meta can fetch
  imageFileName: string;
  pagePath: string; // stable archive path for this post
  // Strings that MUST appear in the caption — the parity contract between
  // the page, the image, and the caption.
  parityKeys: string[];
};

/* ------------------------------------------------------------------ dates */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

export function chicagoDateKey(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_SOCIAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function chicagoHour(at: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_SOCIAL_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(at);

  return Number(hour) % 24;
}

export function weekdayIndexForDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

export function formatFullDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// Whole days between two date keys (b - a).
export function daysBetweenDateKeys(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

// FNV-1a — deterministic seed for date-based selection.
export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/* --------------------------------------------------------------- captions */

// The first caption line doubles as the duplicate-publication marker the
// publisher searches for on the brand's own Instagram account.
export function captionMarkerForDate(
  config: Pick<DailySocialBrandConfig, "markerPrefix">,
  dateKey: string,
) {
  return `${config.markerPrefix} — ${formatFullDate(dateKey)}`;
}

// Consistent Instagram UTMs for any URL a visitor can tap from social.
export function withInstagramUtm(url: string, brand: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("utm_source", "instagram");
  parsed.searchParams.set("utm_medium", "social");
  parsed.searchParams.set("utm_campaign", `daily-${brand}`);
  return parsed.toString();
}

export function activeHashtags(defaults: string[]): string[] {
  const fromEnv =
    typeof process !== "undefined" ? process.env.SOCIAL_HASHTAGS : undefined;

  if (fromEnv && fromEnv.trim()) {
    return fromEnv
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return defaults;
}

/* ------------------------------------------------------------- validation */

// The parity contract: a post may only publish when it is complete and its
// caption provably carries the same facts the page and image render.
export function validateDailySocialPost(
  config: DailySocialBrandConfig,
  post: DailySocialPost,
): string[] {
  const problems: string[] = [];

  if (!post.contentId) problems.push("post has no content id");
  if (!post.title.trim()) problems.push("post has no title");
  if (!post.imagePath.startsWith("/")) problems.push("image path is not site-relative");
  if (!post.pagePath.startsWith("/")) problems.push("page path is not site-relative");

  if (!post.caption.startsWith(captionMarkerForDate(config, post.date))) {
    problems.push("caption is missing its date marker line");
  }

  for (const key of post.parityKeys) {
    if (!post.caption.includes(key)) {
      problems.push(`caption is missing required content: ${key}`);
    }
  }

  return problems;
}

export function absoluteSiteUrl(
  config: Pick<DailySocialBrandConfig, "siteUrl">,
  path: string,
) {
  const base =
    (typeof process !== "undefined" && process.env.SITE_BASE_URL) ||
    config.siteUrl;

  return `${base.replace(/\/$/, "")}${path}`;
}
