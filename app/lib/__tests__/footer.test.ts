// Family footer standard guard (owner, 2026-08-02): the root layout renders
// the shared centered three-line OpenMirrorFooter on every route —
//   OpenMirrorLLC.com · About · ✝️ ❤️ 🙏
//   Contact · Disclaimer      (anchors into THIS site's own About page)
//   Open Mirror LLC is a small independent company.
// The component is canonical in the hub repo (packages/openmirror-ui) —
// never edit the local copy. The About page must carry the two landing
// sections the footer links to.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const layout = readFileSync(join(app, "layout.tsx"), "utf8");
const footer = readFileSync(join(app, "OpenMirrorFooter.tsx"), "utf8");
const about = readFileSync(join(__dirname, "../../about/page.tsx"), "utf8");

describe("family footer standard", () => {
  it("root layout renders the shared footer with the default own-About route", () => {
    expect(layout).toContain("<OpenMirrorFooter />");
    expect(layout).not.toMatch(/<OpenMirrorFooter\s+\w/);
  });

  it("line one: OpenMirrorLLC.com · own About · CrossHeartPray icons", () => {
    expect(footer).toContain(">OpenMirrorLLC.com</a>");
    expect(footer).toContain('"https://openmirrorllc.com"');
    expect(footer).toContain("{aboutHref}");
    expect(footer).toContain('"https://crossheartpray.com"');
    expect(footer).toContain('aria-label="Visit CrossHeartPray"');
    expect(footer).toContain('<span aria-hidden="true">✝️ ❤️ 🙏</span>');
  });

  it("line two anchors into this site's own About page, never email or pages", () => {
    expect(footer).toContain("\`\${aboutHref}#contact\`");
    expect(footer).toContain("\`\${aboutHref}#disclaimer\`");
    expect(footer).not.toContain("mailto:");
  });

  it("line three is the plain ownership sentence", () => {
    expect(footer).toContain("Open Mirror LLC is a small independent company.");
  });

  it("the About page carries the two footer landing sections", () => {
    expect(about).toContain('id="contact"');
    expect(about).toContain('id="disclaimer"');
  });

  it("old clutter stays gone and links open in the same tab", () => {
    for (const banned of [
      "©",
      "About Open Mirror",
      ">CrossHeartPray</a>",
      'target="_blank"',
    ]) {
      expect(footer).not.toContain(banned);
    }
  });
});
