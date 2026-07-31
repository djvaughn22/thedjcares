// Verify every YouTube item: oEmbed (alive + official author) and real
// duration (lengthSeconds from the watch page). Writes scripts/yt-verify.json.
// Run: node scripts/verify-yt.mjs [items.json] [out.json]
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2] ?? "scripts/yt-items.json";
const out = process.argv[3] ?? "scripts/yt-verify.json";
const items = JSON.parse(readFileSync(src, "utf8"));
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function withRetry(fn, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function check(item) {
  const res = { id: item.id, videoId: item.videoId, ok: false, title: null, author: null, lengthSeconds: null, error: null };
  try {
    const o = await withRetry(async () => {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${item.videoId}`)}&format=json`,
        { headers: { "User-Agent": UA } },
      );
      if (!r.ok) throw new Error(`oembed ${r.status}`);
      return r.json();
    });
    res.title = o.title;
    res.author = o.author_name;
    res.ok = true;
  } catch (e) {
    res.error = String(e.message ?? e);
    return res; // dead video — no point scraping duration
  }
  try {
    const html = await withRetry(async () => {
      const r = await fetch(`https://www.youtube.com/watch?v=${item.videoId}`, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en" } });
      if (!r.ok) throw new Error(`watch ${r.status}`);
      return r.text();
    });
    const m = html.match(/"lengthSeconds":"(\d+)"/);
    if (m) res.lengthSeconds = parseInt(m[1], 10);
    if (/"status":"AGE_CHECK_REQUIRED"|age-restricted/i.test(html)) res.error = "age-restricted";
    if (/"playableInEmbed":false/.test(html)) res.error = (res.error ? res.error + ";" : "") + "not-embeddable";
  } catch (e) {
    res.error = `duration: ${String(e.message ?? e)}`;
  }
  return res;
}

const results = [];
const CONC = 5;
let idx = 0;
async function worker() {
  while (idx < items.length) {
    const i = idx++;
    results[i] = await check(items[i]);
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${items.length}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
writeFileSync(out, JSON.stringify(results, null, 1));
const bad = results.filter((r) => !r.ok);
const noLen = results.filter((r) => r.ok && !r.lengthSeconds);
const notEmbed = results.filter((r) => r.error && r.error.includes("not-embeddable"));
console.log(`done: ${results.length} checked, ${bad.length} dead, ${noLen.length} missing duration, ${notEmbed.length} not embeddable`);
if (bad.length) console.log("DEAD:", bad.map((b) => `${b.id} (${b.error})`).join("\n"));
