// Daily Encouragement Instagram card — an ORIGINAL TheDJCares recommendation
// design (title + attribution + DJ's curated summary). No copyrighted
// artwork, thumbnails, or re-uploaded media; the card points people to the
// authorized source via the bio link.
//
// GET /api/social/daily-encouragement/2026-07-12.png → 1080×1350 PNG (4:5)

import { ImageResponse } from "next/og";
import { buildDailyEncouragement, DJC_BRAND } from "../../../../lib/dailyEncouragement";
import { isValidDateKey } from "../../../../lib/dailySocialCore";

export const dynamic = "force-dynamic";

const NAVY = "#0b1220";
const BORDER = "#26324c";
const VIOLET = "#A78BFA";
const TEXT = "#e8edf5";
const MUTED = "#94a3b8";

function fitTitle(title: string) {
  if (title.length <= 30) return 82;
  if (title.length <= 55) return 62;
  return 48;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ image: string }> },
) {
  const { image } = await params;
  const dateKey = image.replace(/\.png$/i, "");

  if (!isValidDateKey(dateKey) || dateKey < DJC_BRAND.startDate) {
    return new Response("Not found", { status: 404 });
  }

  const offset = Number(new URL(request.url).searchParams.get("offset")) || 0;
  const { item, label, post } = await buildDailyEncouragement(dateKey, { offset });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NAVY,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            flexGrow: 1,
            border: `3px solid ${BORDER}`,
            borderRadius: 44,
            padding: "56px 60px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 64 }}>🎧</div>
            <div style={{ marginTop: 20, fontSize: 30, letterSpacing: 7, color: VIOLET }}>
              {label.toUpperCase()}
            </div>
            <div style={{ marginTop: 10, fontSize: 30, color: MUTED }}>{post.fullDate}</div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "#141d2e",
              border: `1px solid ${BORDER}`,
              borderRadius: 36,
              padding: "48px 52px",
              width: "100%",
            }}
          >
            <div style={{ fontSize: fitTitle(item.title), fontWeight: 700, color: TEXT, lineHeight: 1.15 }}>
              {item.title}
            </div>
            <div style={{ marginTop: 22, fontSize: 34, color: VIOLET }}>{item.author}</div>
            <div
              style={{
                marginTop: 26,
                fontSize: 30,
                lineHeight: 1.45,
                color: MUTED,
              }}
            >
              {(item.summary ?? "").length > 180
                ? `${(item.summary ?? "").slice(0, 180).trimEnd()}…`
                : item.summary}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 30, color: TEXT }}>Follow Jesus. Love God. Pray.</div>
            <div style={{ marginTop: 14, fontSize: 27, letterSpacing: 4, color: MUTED }}>
              THEDJCARES.COM/TODAY
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      emoji: "twemoji",
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
