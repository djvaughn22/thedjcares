// Server-side usage protection for Digital DJ's one AI call.
//
// Two layers, both enforced before any OpenAI request:
//   1. Burst limit  — max requests per rolling minute per visitor.
//   2. Daily quota  — max requests per UTC day per visitor
//                     (DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT, default 5).
//
// Visitors are identified by a salted SHA-256 hash of their forwarded IP.
// The raw IP is never stored; the salt is random per server instance, so
// hashes can't be correlated across deploys or joined back to an address.
//
// HONEST LIMITATION: this store lives in process memory. On serverless
// (Vercel), separate instances do not share it, so a determined caller can
// exceed the quota by landing on fresh instances. That is acceptable for a
// free preview of a capped, low-cost call; before any PAID launch this must
// move to a durable store (the project's database or a rate-limit service).

import { createHash, randomBytes } from "crypto";
import { getDailyAnonLimit } from "./featureAccess";

const BURST_WINDOW_MS = 60_000;
const BURST_MAX = 4; // per rolling minute

// Per-instance salt: never persisted, never logged.
const salt = process.env.DIGITAL_DJ_RATE_SALT || randomBytes(16).toString("hex");

type Bucket = { day: string; dayCount: number; recent: number[] };
const buckets = new Map<string, Bucket>();

// Privacy-conscious visitor key. Accepts the first hop of x-forwarded-for.
export function anonymousKey(ip: string | null | undefined): string {
  const source = (ip || "unknown").split(",")[0].trim();
  return createHash("sha256").update(salt).update(source).digest("hex").slice(0, 32);
}

export type RateDecision = { allowed: boolean; reason?: "burst" | "daily_quota" };

export function checkRateLimit(key: string, now: number = Date.now()): RateDecision {
  const day = new Date(now).toISOString().slice(0, 10);
  let bucket = buckets.get(key);
  if (!bucket || bucket.day !== day) {
    bucket = { day, dayCount: 0, recent: [] };
    buckets.set(key, bucket);
  }

  bucket.recent = bucket.recent.filter((t) => now - t < BURST_WINDOW_MS);
  if (bucket.recent.length >= BURST_MAX) return { allowed: false, reason: "burst" };
  if (bucket.dayCount >= getDailyAnonLimit()) return { allowed: false, reason: "daily_quota" };

  bucket.recent.push(now);
  bucket.dayCount += 1;

  // Keep the map from growing without bound on a long-lived instance.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.day !== day) buckets.delete(k);
    }
  }

  return { allowed: true };
}

// Test hook — clears all in-memory state.
export function resetRateLimitStore(): void {
  buckets.clear();
}
