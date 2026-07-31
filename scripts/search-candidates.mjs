// Search YouTube for expansion candidates (approved artists only) and dump
// the top results' videoRenderer data for manual review + oEmbed verification.
// Run: node scripts/search-candidates.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const QUERIES = [
  // artist | song | why (mood gaps)
  ["Phil Wickham", "House of the Lord official music video"],
  ["Phil Wickham", "Hymn of Heaven official"],
  ["Phil Wickham", "This Is Our God official music video"],
  ["Phil Wickham", "Sunday Is Coming official"],
  ["Chris Tomlin", "Good Good Father official"],
  ["Chris Tomlin", "How Great Is Our God official"],
  ["Chris Tomlin", "Whom Shall I Fear God of Angel Armies official"],
  ["Chris Tomlin", "Holy Forever official"],
  ["Casting Crowns", "Only Jesus official music video"],
  ["Casting Crowns", "Voice of Truth official"],
  ["MercyMe", "Greater official"],
  ["MercyMe", "Happy Dance official"],
  ["MercyMe", "Say I Won't official music video"],
  ["Zach Williams", "Old Church Choir official"],
  ["Zach Williams", "Less Like Me official"],
  ["for KING & COUNTRY", "TOGETHER official music video"],
  ["for KING & COUNTRY", "Love Me Like I Am official"],
  ["CAIN", "Yes He Can official"],
  ["CAIN", "I'm So Blessed official music video"],
  ["Anne Wilson", "Sunday Sermons official"],
  ["Anne Wilson", "Strong official"],
  ["Lauren Daigle", "Rescue official music video"],
  ["Lauren Daigle", "Trust In You official music video"],
  ["Lauren Daigle", "How Can It Be official music video"],
  ["Lauren Daigle", "Look Up Child official"],
  ["Matthew West", "Truth Be Told official"],
  ["Matthew West", "My Story Your Glory official"],
  ["Matthew West", "Amen official"],
  ["Newsboys", "He Reigns official"],
  ["Newsboys", "Your Love Never Fails official"],
  ["We The Kingdom", "God So Loved official music video"],
  ["We The Kingdom", "Child of Love official"],
  ["Forrest Frank", "UP official"],
  ["Forrest Frank", "GOOD NEWS official"],
  ["Leeland", "Better Word official"],
  ["Shane & Shane", "Psalm 23 Surely Goodness official"],
  ["Shane & Shane", "In Christ Alone official"],
  ["Shane & Shane", "Goodness of God official"],
  ["Reawaken Hymns", "Holy Holy Holy"],
  ["Reawaken Hymns", "'Tis So Sweet to Trust in Jesus"],
  ["Reawaken Hymns", "I Surrender All"],
  ["Reawaken Hymns", "Turn Your Eyes Upon Jesus"],
  ["Reawaken Hymns", "Doxology"],
  ["Seph Schlueter", "Symphony official"],
  ["All Sons & Daughters", "Called Me Higher official"],
];

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function search(q) {
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en" },
  });
  const html = await r.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const data = JSON.parse(m[1]);
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object" || out.length >= 5) return;
    if (node.videoRenderer) {
      const v = node.videoRenderer;
      out.push({
        videoId: v.videoId,
        title: v.title?.runs?.map((x) => x.text).join("") ?? "",
        channel: v.ownerText?.runs?.map((x) => x.text).join("") ?? "",
        length: v.lengthText?.simpleText ?? null,
      });
      return;
    }
    for (const k of Object.keys(node)) walk(node[k]);
  };
  walk(data);
  return out;
}

const prev = existsSync("scripts/search-results.json") ? JSON.parse(readFileSync("scripts/search-results.json", "utf8")) : [];
const done = new Map(prev.filter((r) => r.top && r.top.length).map((r) => [r.artist + "|" + r.query, r]));
const results = [];
for (const [artist, q] of QUERIES) {
  const cached = done.get(artist + "|" + q);
  if (cached) { results.push(cached); continue; }
  try {
    let top = [];
    for (let attempt = 0; attempt < 3 && top.length === 0; attempt++) {
      try { top = await search(`${artist} ${q}`); } catch (e) { if (attempt === 2) throw e; }
      if (top.length === 0) await new Promise((r) => setTimeout(r, 4000));
    }
    results.push({ artist, query: q, top });
    console.log(`${artist} — ${q}: ${top[0]?.title ?? "??"} [${top[0]?.channel}] ${top[0]?.length ?? ""}`);
  } catch (e) {
    results.push({ artist, query: q, error: String(e) });
    console.log(`${artist} — ${q}: ERROR ${e}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
writeFileSync("scripts/search-results.json", JSON.stringify(results, null, 1));
