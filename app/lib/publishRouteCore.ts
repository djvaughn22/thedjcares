// ============================================================================
// OPEN MIRROR DAILY SOCIAL ENGINE — publish route factory (brand-agnostic)
// Canonical copy: open-mirror/packages/daily-social-engine/
// Synced into each site's lib — NEVER edit the site copies directly.
//
// Each site's /api/social/instagram/publish route is three lines:
//   const handler = createDailyPublishHandler({ brandConfig, buildPost });
//   export const GET = handler; export const POST = handler;
//
// Auth:
//   • Vercel Cron: "Authorization: Bearer $CRON_SECRET"
//   • Admin: "x-admin-key" header or ?key= matching SOCIAL_ADMIN_KEY
// Modes: ?dryRun=1, ?force=1 (admin, ignores pause switch), ?mode=status,
//        ?date=YYYY-MM-DD (admin; future only for dry-run/status),
//        plus adapter-defined params passed through (e.g. ?offset=1).
// ============================================================================

import {
  captionMarkerForDate,
  chicagoDateKey,
  chicagoHour,
  isValidDateKey,
  type DailySocialBrandConfig,
  type DailySocialPost,
} from "./dailySocialCore";
import {
  findPublishedMediaForMarker,
  missingCredentials,
  publishDailySocialPost,
  readPublishConfig,
} from "./instagramPublisherCore";

type Caller = "cron" | "admin" | null;

export type BuildPostFn = (
  dateKey: string,
  options: { searchParams: URLSearchParams; forPublish: boolean },
) => Promise<DailySocialPost>;

function identifyCaller(request: Request): Caller {
  const auth = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return "cron";
  }

  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-admin-key") ?? url.searchParams.get("key") ?? "";

  if (adminKey && provided === adminKey) {
    return "admin";
  }

  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function createDailyPublishHandler(options: {
  brandConfig: DailySocialBrandConfig;
  buildPost: BuildPostFn;
}) {
  const { brandConfig, buildPost } = options;

  return async function handle(request: Request): Promise<Response> {
    const caller = identifyCaller(request);

    if (!caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const config = readPublishConfig();
    const today = chicagoDateKey();

    const requestedDate = url.searchParams.get("date");
    const dryRun = url.searchParams.get("dryRun") === "1";
    const force = caller === "admin" && url.searchParams.get("force") === "1";
    const mode = url.searchParams.get("mode");

    // Cron always publishes "today"; admins may target a past day for
    // retries, or a future day for dry runs / status checks only.
    let dateKey = today;
    if (caller === "admin" && requestedDate) {
      if (!isValidDateKey(requestedDate)) {
        return json({ error: "Invalid date" }, 400);
      }
      if (requestedDate < brandConfig.startDate) {
        return json({ error: `date must be ${brandConfig.startDate} or later` }, 400);
      }
      if (requestedDate > today && !dryRun && mode !== "status") {
        return json({ error: `cannot publish a future date (today is ${today})` }, 400);
      }
      dateKey = requestedDate;
    }

    // Status check only — no publishing.
    if (mode === "status") {
      const missing = missingCredentials(config);
      if (missing.length) {
        return json({
          brand: brandConfig.brand,
          date: dateKey,
          configured: false,
          missing,
          autopublishEnabled: config.autopublishEnabled,
        });
      }

      try {
        const marker = captionMarkerForDate(brandConfig, dateKey);
        const existing = await findPublishedMediaForMarker(config, marker);
        return json({
          brand: brandConfig.brand,
          date: dateKey,
          configured: true,
          autopublishEnabled: config.autopublishEnabled,
          published: Boolean(existing),
          mediaId: existing?.id ?? null,
          publishedAt: existing?.timestamp ?? null,
        });
      } catch (error) {
        return json(
          {
            brand: brandConfig.brand,
            date: dateKey,
            configured: true,
            autopublishEnabled: config.autopublishEnabled,
            error: error instanceof Error ? error.message : "status check failed",
          },
          502,
        );
      }
    }

    // Emergency pause switch — cron respects it always; admin can force past it.
    if (!config.autopublishEnabled && !force && !dryRun) {
      return json({
        brand: brandConfig.brand,
        date: dateKey,
        published: false,
        skippedReason:
          "autopublish is disabled (INSTAGRAM_AUTOPUBLISH_ENABLED is not 'true'); admins can retry with force=1",
      });
    }

    // Optional hour gate for hourly cron schedules.
    if (caller === "cron" && config.publishHour !== null) {
      const hourNow = chicagoHour();
      if (hourNow !== config.publishHour) {
        return json({
          brand: brandConfig.brand,
          date: dateKey,
          published: false,
          skippedReason: `outside publish hour (now ${hourNow}h, configured ${config.publishHour}h America/Chicago)`,
        });
      }
    }

    // Build the post — adapters re-verify their source here (availability,
    // link reachability). A failure returns a clean error, never a crash.
    let post: DailySocialPost;
    try {
      post = await buildPost(dateKey, {
        searchParams: url.searchParams,
        forPublish: !dryRun,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "content selection failed";
      console.log(
        `[daily-social:${brandConfig.brand}] date=${dateKey} caller=${caller} stage=build-post error=${message}`,
      );
      return json(
        {
          brand: brandConfig.brand,
          date: dateKey,
          published: false,
          error: { stage: "build-post", message },
        },
        502,
      );
    }

    const result = await publishDailySocialPost({ brandConfig, post, dryRun, config });

    if (!dryRun) {
      delete result.caption;
    }

    console.log(
      `[daily-social:${brandConfig.brand}] date=${result.date} caller=${caller} dryRun=${dryRun} ok=${result.ok} published=${result.published} mediaId=${result.mediaId ?? "-"} error=${result.error ? `${result.error.stage}: ${result.error.message}` : "-"}`,
    );

    return json(result, result.ok ? 200 : 502);
  };
}
