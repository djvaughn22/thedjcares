import { NextRequest, NextResponse } from "next/server";
import { canAccessFeature } from "../../../lib/featureAccess";
import { parseUserIntentWithAi } from "../../../lib/digitalDjAiParser";

export async function POST(request: NextRequest) {
  // Check feature access.
  const access = await canAccessFeature({
    featureKey: "digital_dj",
    viewer: undefined, // Anonymous for preview
  });

  if (!access.allowed) {
    return NextResponse.json(
      { error: "Feature not available", reason: access.reason },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const userText = body.userText as string;

    if (!userText || typeof userText !== "string") {
      return NextResponse.json(
        { error: "Invalid request: userText is required" },
        { status: 400 },
      );
    }

    if (userText.length > 300) {
      return NextResponse.json(
        { error: "Text too long (max 300 characters)" },
        { status: 400 },
      );
    }

    // Call AI parser with safety guards.
    const intent = await parseUserIntentWithAi(userText);

    if (!intent) {
      // Parsing failed or was rejected — return empty intent to trigger fallback.
      return NextResponse.json({ intent: null });
    }

    return NextResponse.json({ intent });
  } catch (error) {
    console.error("digital-dj parse-intent error:", error);
    // Return graceful error; client will fall back to deterministic.
    return NextResponse.json(
      { error: "Parsing failed", intent: null },
      { status: 500 },
    );
  }
}
