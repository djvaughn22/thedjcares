import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  canAccessFeature,
  getCurrentAccessMode,
  isAiEnabled,
  getDailyAnonLimit,
  getDailyAccountLimit,
  parseAccessMode,
  parseAiEnabled,
} from "../featureAccess";

describe("featureAccess", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("parseAccessMode", () => {
    it("returns 'preview' for valid preview", () => {
      expect(parseAccessMode("preview")).toBe("preview");
    });

    it("returns 'subscriber' for valid subscriber", () => {
      expect(parseAccessMode("subscriber")).toBe("subscriber");
    });

    it("returns 'off' for valid off", () => {
      expect(parseAccessMode("off")).toBe("off");
    });

    it("defaults to 'preview' for undefined", () => {
      expect(parseAccessMode(undefined)).toBe("preview");
    });

    it("defaults to 'preview' for invalid values", () => {
      expect(parseAccessMode("invalid")).toBe("preview");
    });
  });

  describe("parseAiEnabled", () => {
    it("returns true for undefined", () => {
      expect(parseAiEnabled(undefined)).toBe(true);
    });

    it("returns true for non-false values", () => {
      expect(parseAiEnabled("true")).toBe(true);
      expect(parseAiEnabled("yes")).toBe(true);
      expect(parseAiEnabled("1")).toBe(true);
    });

    it("returns false for 'false'", () => {
      expect(parseAiEnabled("false")).toBe(false);
    });
  });

  describe("getCurrentAccessMode", () => {
    it("reads DIGITAL_DJ_ACCESS_MODE from environment", () => {
      process.env.DIGITAL_DJ_ACCESS_MODE = "subscriber";
      expect(getCurrentAccessMode("digital_dj")).toBe("subscriber");
    });

    it("defaults to preview if unset", () => {
      delete process.env.DIGITAL_DJ_ACCESS_MODE;
      expect(getCurrentAccessMode("digital_dj")).toBe("preview");
    });
  });

  describe("isAiEnabled", () => {
    it("returns true by default", () => {
      delete process.env.DIGITAL_DJ_AI_ENABLED;
      expect(isAiEnabled("digital_dj")).toBe(true);
    });

    it("returns false when set to false", () => {
      process.env.DIGITAL_DJ_AI_ENABLED = "false";
      expect(isAiEnabled("digital_dj")).toBe(false);
    });
  });

  describe("getDailyAnonLimit", () => {
    it("returns default 5 if unset", () => {
      delete process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT;
      expect(getDailyAnonLimit()).toBe(5);
    });

    it("returns parsed value if set", () => {
      process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT = "10";
      expect(getDailyAnonLimit()).toBe(10);
    });

    it("returns default if NaN", () => {
      process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT = "not-a-number";
      expect(getDailyAnonLimit()).toBe(5);
    });

    it("never returns negative", () => {
      process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT = "-5";
      expect(getDailyAnonLimit()).toBe(0);
    });
  });

  describe("getDailyAccountLimit", () => {
    it("returns default 20 if unset", () => {
      delete process.env.DIGITAL_DJ_DAILY_ACCOUNT_LIMIT;
      expect(getDailyAccountLimit()).toBe(20);
    });

    it("returns parsed value if set", () => {
      process.env.DIGITAL_DJ_DAILY_ACCOUNT_LIMIT = "50";
      expect(getDailyAccountLimit()).toBe(50);
    });
  });

  describe("canAccessFeature", () => {
    it("allows owner in any mode", async () => {
      process.env.DIGITAL_DJ_ACCESS_MODE = "off";
      const result = await canAccessFeature({
        featureKey: "digital_dj",
        viewer: { isOwner: true },
      });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("owner_override");
    });

    it("blocks access when feature is off", async () => {
      process.env.DIGITAL_DJ_ACCESS_MODE = "off";
      const result = await canAccessFeature({
        featureKey: "digital_dj",
        viewer: undefined,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("feature_off");
    });

    it("allows preview mode for anyone", async () => {
      process.env.DIGITAL_DJ_ACCESS_MODE = "preview";
      const result = await canAccessFeature({
        featureKey: "digital_dj",
        viewer: undefined,
      });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("preview_access");
    });

    it("blocks subscriber mode for anonymous", async () => {
      process.env.DIGITAL_DJ_ACCESS_MODE = "subscriber";
      const result = await canAccessFeature({
        featureKey: "digital_dj",
        viewer: undefined,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("sign_in_required");
    });

    it("blocks subscriber mode for non-owner account without subscription", async () => {
      process.env.DIGITAL_DJ_ACCESS_MODE = "subscriber";
      const result = await canAccessFeature({
        featureKey: "digital_dj",
        viewer: { id: "user-123", isOwner: false },
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("subscription_required");
    });
  });
});
