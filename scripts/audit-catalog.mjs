// One-off catalog audit: per-mood eligible minutes for a music/video mood
// queue, plus a dump of every YouTube item (id, videoId, duration known?).
// Run: node scripts/audit-catalog.mjs
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, logLevel: "silent" });
const lib = await vite.ssrLoadModule("/app/lib/djCaresLibrary.ts");
const review = await vite.ssrLoadModule("/app/lib/djMoodReview.ts");
const sel = await vite.ssrLoadModule("/app/lib/digitalDjSelector.ts");

const { LIBRARY, activeItems } = lib;
const { MOOD_REVIEWS } = review;
const { NEED_TO_VIBES, estimateDuration, eligibleForSomeNeed } = sel;

const music = activeItems(LIBRARY).filter((i) => i.type === "music" && i.videoId);

console.log(`music items (YouTube): ${music.length}`);
console.log(`with real duration: ${music.filter((i) => i.duration).length}`);
console.log(`gated (review entry, unreviewed): ${music.filter((i) => MOOD_REVIEWS[i.id] && !MOOD_REVIEWS[i.id].ownerReviewed).length}`);

const needs = Object.keys(NEED_TO_VIBES).filter((n) => n !== "surprise");
console.log("\nPer-mood eligible MUSIC minutes (mood-gate applied, known durations only counted as-is, unknown = 4min est):");
for (const need of needs) {
  const pool = music.filter((i) => eligibleForSomeNeed(i, [need]));
  const secs = pool.reduce((s, i) => s + (i.duration ? estimateDuration(i) : 240), 0);
  console.log(`  ${need.padEnd(14)} ${String(pool.length).padStart(3)} items  ${Math.round(secs / 60)} min`);
}

// Dump every YouTube item for external verification (oEmbed + duration fetch).
import { writeFileSync } from "node:fs";
const all = activeItems(LIBRARY).filter((i) => i.videoId).map((i) => ({ id: i.id, videoId: i.videoId, type: i.type, title: i.title, author: i.author, duration: i.duration ?? null }));
writeFileSync("scripts/yt-items.json", JSON.stringify(all, null, 1));
console.log(`\nwrote scripts/yt-items.json: ${all.length} YouTube items`);
await vite.close();
