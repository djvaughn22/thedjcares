// Calm home (owner, Nov 14 2026): the first screen is the name, one plain
// line, four words (Listen, Watch, Reflect, Explore) and a nature photo;
// the page then follows those four words in order. Same source-text style
// as the rest of the suite (vitest runs in node, no DOM here).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const globalsCss = readFileSync(join(app, "globals.css"), "utf8");

const homeRegion = homeClient.slice(
  homeClient.indexOf("{/* The first screen:"),
  homeClient.indexOf("{/* Every browsing tab below follows the same order"),
);

describe("the four words on the first screen", () => {
  it("are exactly Listen, Watch, Reflect, Explore, in that order", () => {
    const src = homeClient.slice(homeClient.indexOf("const HOME_DOORS = ["), homeClient.indexOf("] as const;", homeClient.indexOf("const HOME_DOORS = [")));
    const labels = [...src.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["Listen", "Watch", "Reflect", "Explore"]);
  });

  it("are plain in-page anchors in a labelled nav, shown on Home only", () => {
    expect(homeRegion).toContain('<nav aria-label="On this page"');
    expect(homeRegion).toContain("href={`#${d.id}`}");
    const navIdx = homeRegion.indexOf('<nav aria-label="On this page"');
    expect(homeRegion.slice(Math.max(0, navIdx - 120), navIdx)).toContain('{tab === "spin" && (');
  });

  it("each lands on its own section, and the sections follow the same order", () => {
    for (const id of ["listen", "watch", "reflect", "explore"]) {
      expect(homeRegion, id).toContain(`<section id="${id}" aria-labelledby="${id}-heading" style={{ ...chapterStyle, order: HOME_ORDER.${id} }}>`);
    }
    const positions = ["listen", "watch", "reflect", "explore"].map((id) => homeRegion.indexOf(`<section id="${id}"`));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("work as shared links from anywhere: the hash handler knows them, and sections clear the sticky family bar", () => {
    expect(homeClient).toContain('"podcasts", ...HOME_DOORS.map((d) => d.id)]');
    expect(homeClient).toMatch(/chapterStyle: React\.CSSProperties = \{ scrollMarginTop: \d+/);
  });
});

describe("every existing feature stays reachable from Home", () => {
  it("each full category opens through goTab, the same client-side path as the category tabs", () => {
    for (const t of ["music", "podcasts", "videos", "sermons", "ministries", "churches"]) {
      expect(homeRegion, t).toContain(`goTab("${t}")`);
    }
  });

  it("the player, Daily Encouragement, Digital DJ and the Spin controls are all still on the page", () => {
    expect(homeRegion).toContain("{started && activePlayerNode}");
    expect(homeRegion).toContain('id="daily-encouragement"');
    expect(homeRegion).toContain('href="/digital-dj"');
    for (const spin of ["🔀 Spin<", "🔀 Another mix", "🔀 Spin another", "🔀 Surprise me", "Tune the spin"]) {
      expect(homeRegion, spin).toContain(spin);
    }
  });
});

describe("the nature photo", () => {
  it("is the owner's own (or clearly licensed) photo; until one is chosen a labelled placeholder holds its place", () => {
    expect(homeClient).toContain("const NATURE_PHOTO: { src: string; alt: string } | null = null;");
    expect(homeRegion).toContain('aria-label="Placeholder for a nature photo"');
    expect(homeRegion).toContain("alt={NATURE_PHOTO.alt}");
  });
});

describe("calm look: flat, no green or teal, nothing see-through", () => {
  it("uses the lavender hub accent and no green or teal anywhere in HomeClient", () => {
    expect(homeClient).toContain('const accent = "#C4B5FD";');
    expect(homeClient).not.toMatch(/#34d399|#2dd4bf|#b9ffb0|#22c55e|#10b981/i);
  });

  it("Home's sections have no translucent fills, gradients or shadows", () => {
    expect(homeRegion).not.toMatch(/rgba\(|gradient\(|boxShadow/);
  });

  it("the calm CSS layer flattens the record: no sheen, no status glow, and no gradients of its own", () => {
    const calm = globalsCss.slice(globalsCss.indexOf("/* ── Calm home"));
    expect(calm).toContain(".djc-calm .djc-vinyl-sheen { display: none; }");
    expect(calm).toContain(".djc-calm .djc-power-light { display: none; }");
    expect(calm).not.toMatch(/gradient\(/);
    expect(homeClient).toContain('<main className="djc-calm"');
  });
});
