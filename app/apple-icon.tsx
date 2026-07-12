import { ImageResponse } from "next/og";

// Apple touch icon — violet headphones drawn in shapes (no emoji/text so it
// renders identically everywhere). Generated at build time.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const earcup = {
    position: "absolute" as const,
    width: 34,
    height: 52,
    background: "#A78BFA",
    borderRadius: 14,
    top: 66,
  };
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 132,
            height: 132,
            display: "flex",
          }}
        >
          {/* Band — arc drawn with a thick top border */}
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 14,
              width: 112,
              height: 100,
              border: "18px solid #A78BFA",
              borderBottom: "18px solid transparent",
              borderRadius: "56px 56px 22px 22px",
              display: "flex",
            }}
          />
          {/* Earcups */}
          <div style={{ ...earcup, left: 2 }} />
          <div style={{ ...earcup, right: 2 }} />
        </div>
      </div>
    ),
    size,
  );
}
