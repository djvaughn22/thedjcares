// Family footer standard guard (owner, 2026-08-02): the root layout renders
// the shared two-band OpenMirrorFooter on every route, exactly once, with the
// five locked destinations. The component itself is canonical in the hub repo
// (packages/openmirror-ui) — never edit the local copy.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const layout = readFileSync(join(app, "layout.tsx"), "utf8");
const footer = readFileSync(join(app, "OpenMirrorFooter.tsx"), "utf8");

describe("family footer standard", () => {
  it("root layout renders the shared footer with no per-site props", () => {
    expect(layout).toContain("<OpenMirrorFooter />");
    expect(layout).not.toMatch(/<OpenMirrorFooter\s+\w/);
  });

  it("footer carries the five locked destinations", () => {
    expect(footer).toContain('"https://openmirrorllc.com"');
    expect(footer).toContain('"https://crossheartpray.com"');
    for (const route of ["/about-open-mirror", "/contact", "/disclaimer"]) {
      expect(footer).toContain(route);
    }
  });

  it("old clutter stays gone and links open in the same tab", () => {
    for (const banned of ["✝️", "About Open Mirror", 'target="_blank"']) {
      expect(footer).not.toContain(banned);
    }
    expect(footer).toContain("new Date().getFullYear()");
  });
});
