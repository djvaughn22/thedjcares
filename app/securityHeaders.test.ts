// Site-wide security headers live in next.config.ts. This locks the set in so a
// later config edit can't drop one without a test failing.
import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "../next.config";

describe("site-wide security headers", () => {
  it("are nosniff, a strict referrer policy and same-origin framing", () => {
    expect(Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]))).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "SAMEORIGIN",
    });
  });

  it("apply to every page, and the /today redirect stays", async () => {
    const rules = await nextConfig.headers!();
    expect(rules.find((r) => r.source === "/:path*")?.headers).toEqual(SECURITY_HEADERS);
    const redirects = await nextConfig.redirects!();
    expect(redirects.find((r) => r.source === "/today")?.destination).toBe("/#daily-encouragement");
  });
});
