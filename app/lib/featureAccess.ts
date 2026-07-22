// Feature access control system for Digital DJ and future premium features.
// Single source of truth for entitlements, access modes, and usage protection.

export type FeatureKey = "digital_dj";
export type FeatureAccessMode = "off" | "preview" | "subscriber";

export type AccessDecision = {
  allowed: boolean;
  mode: FeatureAccessMode;
  reason:
    | "feature_off"
    | "preview_access"
    | "subscriber_entitled"
    | "owner_override"
    | "sign_in_required"
    | "subscription_required"
    | "usage_limit";
};

export type Entitlement = {
  subjectId: string;
  featureKey?: FeatureKey;
  planId?: string;
  status: "active" | "inactive" | "expired" | "revoked";
  source: "owner" | "manual" | "promotion" | "billing";
  startsAt?: Date;
  endsAt?: Date;
};

// Parse and validate feature access mode from environment variable.
export function parseAccessMode(value: string | undefined): FeatureAccessMode {
  if (value === "preview" || value === "subscriber") return value;
  if (value === "off") return value;
  // Default to preview if undefined or invalid.
  return "preview";
}

// Parse and validate AI enabled flag from environment variable.
export function parseAiEnabled(value: string | undefined): boolean {
  return value !== "false"; // Default to true if undefined or non-false.
}

// Get current feature access mode from environment.
export function getCurrentAccessMode(featureKey: FeatureKey): FeatureAccessMode {
  if (featureKey === "digital_dj") {
    return parseAccessMode(process.env.DIGITAL_DJ_ACCESS_MODE);
  }
  return "off";
}

// Check if AI is enabled for this feature.
export function isAiEnabled(featureKey: FeatureKey): boolean {
  if (featureKey === "digital_dj") {
    return parseAiEnabled(process.env.DIGITAL_DJ_AI_ENABLED);
  }
  return false;
}

// Get daily rate limit for anonymous users.
export function getDailyAnonLimit(): number {
  const limit = process.env.DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT;
  if (!limit) return 5; // Default: 5 AI requests per day per anon user
  const parsed = parseInt(limit, 10);
  return isNaN(parsed) ? 5 : Math.max(0, parsed);
}

// Get daily rate limit for authenticated users.
export function getDailyAccountLimit(): number {
  const limit = process.env.DIGITAL_DJ_DAILY_ACCOUNT_LIMIT;
  if (!limit) return 20; // Default: 20 AI requests per day per account
  const parsed = parseInt(limit, 10);
  return isNaN(parsed) ? 20 : Math.max(0, parsed);
}

// Main authorization check — used by all routes and actions.
export async function canAccessFeature(args: {
  featureKey: FeatureKey;
  viewer?: { id?: string; isOwner?: boolean };
  requestContext?: { ip?: string };
}): Promise<AccessDecision> {
  const { featureKey, viewer } = args;
  const mode = getCurrentAccessMode(featureKey);

  // Owner override always works.
  if (viewer?.isOwner) {
    return {
      allowed: true,
      mode,
      reason: "owner_override",
    };
  }

  // Check access mode.
  if (mode === "off") {
    return {
      allowed: false,
      mode: "off",
      reason: "feature_off",
    };
  }

  if (mode === "preview") {
    return {
      allowed: true,
      mode: "preview",
      reason: "preview_access",
    };
  }

  if (mode === "subscriber") {
    if (!viewer?.id) {
      return {
        allowed: false,
        mode: "subscriber",
        reason: "sign_in_required",
      };
    }
    // TODO: check actual subscription status when billing is enabled.
    // For now, deny all non-owner subscribers in this mode.
    return {
      allowed: false,
      mode: "subscriber",
      reason: "subscription_required",
    };
  }

  return {
    allowed: false,
    mode: "off",
    reason: "feature_off",
  };
}

// Future plan metadata — inactive, for future billing integration.
export const FUTURE_PLANS = {
  open_mirror_apps_monthly: {
    id: "open_mirror_apps_monthly",
    name: "Open Mirror Apps",
    priceCents: 299,
    currency: "USD",
    interval: "month" as const,
    active: false,
    billingEnabled: false,
    publiclyVisible: false,
  },
} as const;
