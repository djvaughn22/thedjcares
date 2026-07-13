// Daily Encouragement → Instagram publish endpoint (shared Daily Social
// Engine). Auth, modes, pause switch, duplicate ledger, and logging all come
// from createDailyPublishHandler — see app/lib/publishRouteCore.ts.

import { createDailyPublishHandler } from "../../../../lib/publishRouteCore";
import { buildDailyEncouragement, DJC_BRAND } from "../../../../lib/dailyEncouragement";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createDailyPublishHandler({
  brandConfig: DJC_BRAND,
  buildPost: async (dateKey, { searchParams, forPublish }) => {
    const offset = Number(searchParams.get("offset")) || 0;
    const { post } = await buildDailyEncouragement(dateKey, { offset, forPublish });
    return post;
  },
});

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
