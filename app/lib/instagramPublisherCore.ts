// ============================================================================
// OPEN MIRROR DAILY SOCIAL ENGINE — Instagram publisher core (brand-agnostic)
// Canonical copy: open-mirror/packages/daily-social-engine/
// Synced into each site's lib — NEVER edit the site copies directly.
//
// Official Meta Instagram Content Publishing flow ONLY:
//   1. POST {graph}/{ig-user-id}/media          → media container
//   2. GET  {graph}/{container-id}?fields=status_code (until FINISHED)
//   3. POST {graph}/{ig-user-id}/media_publish  → live post
//
// Duplicate prevention needs no database: every caption starts with a unique
// per-date marker line; before publishing we list the account's recent media
// and refuse if any caption already carries the marker. The account itself is
// the ledger, which makes publish endpoints safely idempotent and retryable.
//
// Brand isolation: each site is its own deployment with its own env vars
// (INSTAGRAM_ACCOUNT_ID, META_ACCESS_TOKEN, INSTAGRAM_AUTOPUBLISH_ENABLED…),
// so one brand pausing or failing can never affect another.
//
// Credentials live ONLY in environment variables and are never included in
// errors, logs, or responses.
// ============================================================================

import {
  absoluteSiteUrl,
  captionMarkerForDate,
  validateDailySocialPost,
  type DailySocialBrandConfig,
  type DailySocialPost,
} from "./dailySocialCore";

export const DEFAULT_GRAPH_API_BASE = "https://graph.facebook.com/v23.0";

export type PublishConfig = {
  autopublishEnabled: boolean;
  publishHour: number | null;
  accountId: string;
  accessToken: string;
  graphApiBase: string;
  siteBaseUrl: string;
};

export function readPublishConfig(
  env: Record<string, string | undefined> = process.env,
): PublishConfig {
  const hourRaw = env.INSTAGRAM_PUBLISH_HOUR?.trim();
  const hour = hourRaw ? Number(hourRaw) : NaN;

  return {
    autopublishEnabled: env.INSTAGRAM_AUTOPUBLISH_ENABLED === "true",
    publishHour:
      Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null,
    accountId: env.INSTAGRAM_ACCOUNT_ID?.trim() ?? "",
    accessToken: env.META_ACCESS_TOKEN?.trim() ?? "",
    graphApiBase:
      env.META_GRAPH_API_BASE?.trim().replace(/\/$/, "") ||
      DEFAULT_GRAPH_API_BASE,
    siteBaseUrl: env.SITE_BASE_URL?.trim().replace(/\/$/, "") || "",
  };
}

export function missingCredentials(config: PublishConfig): string[] {
  const missing: string[] = [];
  if (!config.accountId) missing.push("INSTAGRAM_ACCOUNT_ID");
  if (!config.accessToken) missing.push("META_ACCESS_TOKEN");
  return missing;
}

export type PublishStep = {
  step: string;
  ok: boolean;
  detail?: string;
};

export type PublishResult = {
  ok: boolean;
  brand: string;
  date: string;
  dryRun: boolean;
  published: boolean;
  alreadyPublished: boolean;
  mediaId?: string;
  publishedAt?: string;
  captionVersion: number;
  imageUrl: string;
  caption?: string;
  skippedReason?: string;
  error?: { stage: string; message: string };
  steps: PublishStep[];
};

type FetchLike = typeof fetch;

export function sanitizeForLog(value: string, config: PublishConfig): string {
  let out = value;
  if (config.accessToken) out = out.split(config.accessToken).join("[token]");
  return out.replace(/access_token=[^&\s"']+/gi, "access_token=[token]");
}

async function graphJson(
  fetchImpl: FetchLike,
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const response = await fetchImpl(url, init);
  let data: Record<string, unknown> = {};

  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON response body — leave data empty.
  }

  return { ok: response.ok, status: response.status, data };
}

function graphErrorMessage(
  data: Record<string, unknown>,
  config: PublishConfig,
): string {
  const error = data.error as Record<string, unknown> | undefined;
  const message =
    (typeof error?.message === "string" && error.message) ||
    "Meta API request failed";
  const code = error?.code != null ? ` (code ${error.code})` : "";
  return sanitizeForLog(`${message}${code}`, config);
}

// Looks for an already-published post whose caption carries the marker.
export async function findPublishedMediaForMarker(
  config: PublishConfig,
  marker: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ id: string; timestamp?: string } | null> {
  const url =
    `${config.graphApiBase}/${config.accountId}/media` +
    `?fields=id,caption,timestamp&limit=30&access_token=${encodeURIComponent(config.accessToken)}`;

  const { ok, data } = await graphJson(fetchImpl, url);
  if (!ok) {
    throw new Error(graphErrorMessage(data, config));
  }

  const items = Array.isArray(data.data)
    ? (data.data as Array<Record<string, unknown>>)
    : [];

  for (const item of items) {
    if (typeof item.caption === "string" && item.caption.includes(marker)) {
      return {
        id: String(item.id),
        timestamp:
          typeof item.timestamp === "string" ? item.timestamp : undefined,
      };
    }
  }

  return null;
}

// Returns the recent captions themselves — content adapters use this to
// exclude recently featured items (e.g. a dog featured this week).
export async function recentPublishedCaptions(
  config: PublishConfig,
  fetchImpl: FetchLike = fetch,
): Promise<string[]> {
  if (missingCredentials(config).length) return [];

  try {
    const url =
      `${config.graphApiBase}/${config.accountId}/media` +
      `?fields=caption&limit=30&access_token=${encodeURIComponent(config.accessToken)}`;
    const { ok, data } = await graphJson(fetchImpl, url);
    if (!ok) return [];

    const items = Array.isArray(data.data)
      ? (data.data as Array<Record<string, unknown>>)
      : [];
    return items
      .map((item) => (typeof item.caption === "string" ? item.caption : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

const CONTAINER_POLL_ATTEMPTS = 6;
const CONTAINER_POLL_DELAY_MS = 2000;

export async function publishDailySocialPost(options: {
  brandConfig: DailySocialBrandConfig;
  post: DailySocialPost;
  dryRun: boolean;
  config?: PublishConfig;
  fetchImpl?: FetchLike;
  pollDelayMs?: number;
}): Promise<PublishResult> {
  const { brandConfig, post, dryRun } = options;
  const config = options.config ?? readPublishConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const pollDelayMs = options.pollDelayMs ?? CONTAINER_POLL_DELAY_MS;
  const steps: PublishStep[] = [];

  const imageUrl = config.siteBaseUrl
    ? `${config.siteBaseUrl}${post.imagePath}`
    : absoluteSiteUrl(brandConfig, post.imagePath);

  const base: Omit<PublishResult, "ok" | "published" | "alreadyPublished"> = {
    brand: brandConfig.brand,
    date: post.date,
    dryRun,
    captionVersion: brandConfig.version,
    imageUrl,
    caption: post.caption,
    steps,
  };

  function fail(stage: string, message: string): PublishResult {
    steps.push({ step: stage, ok: false, detail: message });
    return {
      ...base,
      ok: false,
      published: false,
      alreadyPublished: false,
      error: { stage, message: sanitizeForLog(message, config) },
    };
  }

  // 1. Authoritative data must be complete — never publish placeholders.
  const dataProblems = validateDailySocialPost(brandConfig, post);
  if (dataProblems.length) {
    return fail("validate-content", dataProblems.join("; "));
  }
  steps.push({ step: "validate-content", ok: true, detail: `${post.typeLabel}: ${post.title}` });

  // 2. Credentials.
  const missing = missingCredentials(config);
  if (missing.length) {
    return fail("credentials", `missing environment variables: ${missing.join(", ")}`);
  }
  steps.push({ step: "credentials", ok: true });

  // 3. Refuse to publish the same date twice.
  const marker = captionMarkerForDate(brandConfig, post.date);
  let existing: { id: string; timestamp?: string } | null = null;
  try {
    existing = await findPublishedMediaForMarker(config, marker, fetchImpl);
  } catch (error) {
    return fail("duplicate-check", error instanceof Error ? error.message : String(error));
  }

  if (existing) {
    steps.push({ step: "duplicate-check", ok: true, detail: `already published as ${existing.id}` });
    return {
      ...base,
      ok: true,
      published: false,
      alreadyPublished: true,
      mediaId: existing.id,
      publishedAt: existing.timestamp,
      skippedReason: "already published for this date",
    };
  }
  steps.push({ step: "duplicate-check", ok: true, detail: "no existing post" });

  // 4. Meta must be able to fetch the image over public HTTPS.
  if (!imageUrl.startsWith("https://")) {
    return fail("image-check", `image URL is not public HTTPS: ${imageUrl}`);
  }

  try {
    const imageResponse = await fetchImpl(imageUrl, { method: "GET" });
    const contentType = imageResponse.headers.get("content-type") ?? "";

    if (!imageResponse.ok || !contentType.includes("image/")) {
      return fail(
        "image-check",
        `image URL returned status ${imageResponse.status} (${contentType || "no content-type"})`,
      );
    }
  } catch (error) {
    return fail("image-check", error instanceof Error ? error.message : String(error));
  }
  steps.push({ step: "image-check", ok: true, detail: imageUrl });

  if (dryRun) {
    steps.push({ step: "dry-run", ok: true, detail: "stopped before creating media container" });
    return { ...base, ok: true, published: false, alreadyPublished: false };
  }

  // 5. Create the media container.
  const createUrl = `${config.graphApiBase}/${config.accountId}/media`;
  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption: post.caption,
    access_token: config.accessToken,
  });

  let containerId = "";
  try {
    const { ok, data } = await graphJson(fetchImpl, createUrl, {
      method: "POST",
      body: createBody,
    });

    if (!ok || typeof data.id !== "string") {
      return fail("create-container", graphErrorMessage(data, config));
    }
    containerId = data.id;
  } catch (error) {
    return fail("create-container", error instanceof Error ? error.message : String(error));
  }
  steps.push({ step: "create-container", ok: true, detail: containerId });

  // 6. Wait for the container to be ready (images are usually instant).
  try {
    for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt += 1) {
      const statusUrl =
        `${config.graphApiBase}/${containerId}` +
        `?fields=status_code&access_token=${encodeURIComponent(config.accessToken)}`;
      const { ok, data } = await graphJson(fetchImpl, statusUrl);

      const statusCode = typeof data.status_code === "string" ? data.status_code : "";

      if (ok && (statusCode === "FINISHED" || statusCode === "")) {
        steps.push({ step: "container-status", ok: true, detail: statusCode || "no status reported" });
        break;
      }

      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        return fail("container-status", `container status ${statusCode}`);
      }

      if (attempt === CONTAINER_POLL_ATTEMPTS - 1) {
        return fail("container-status", "container never reached FINISHED");
      }

      await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
    }
  } catch (error) {
    return fail("container-status", error instanceof Error ? error.message : String(error));
  }

  // 7. Publish.
  const publishUrl = `${config.graphApiBase}/${config.accountId}/media_publish`;
  const publishBody = new URLSearchParams({
    creation_id: containerId,
    access_token: config.accessToken,
  });

  try {
    const { ok, data } = await graphJson(fetchImpl, publishUrl, {
      method: "POST",
      body: publishBody,
    });

    if (!ok || typeof data.id !== "string") {
      return fail("media-publish", graphErrorMessage(data, config));
    }

    const publishedAt = new Date().toISOString();
    steps.push({ step: "media-publish", ok: true, detail: data.id });

    return {
      ...base,
      ok: true,
      published: true,
      alreadyPublished: false,
      mediaId: data.id,
      publishedAt,
    };
  } catch (error) {
    return fail("media-publish", error instanceof Error ? error.message : String(error));
  }
}
