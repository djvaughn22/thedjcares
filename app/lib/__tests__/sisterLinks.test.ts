// Sister-site links (owner direction 2026-10-07): TheDJCares may send people
// to PleaseBeReady once, optionally, on the About page. The listening
// experience itself (home, Digital DJ, Today) never links to it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = join(__dirname, "..", "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
  });
}

describe("PleaseBeReady link", () => {
  it("appears only on the About page, once, with attribution", () => {
    const hits = walk(appDir).filter((f) => readFileSync(f, "utf8").includes("pleasebeready.com"));
    expect(hits.map((f) => f.slice(appDir.length + 1))).toEqual(["about/page.tsx"]);
    const about = readFileSync(join(appDir, "about", "page.tsx"), "utf8");
    const links = about.match(/https:\/\/pleasebeready\.com[^"]*/g) ?? [];
    expect(links).toHaveLength(1);
    expect(links[0]).toContain("utm_source=thedjcares");
  });
});
