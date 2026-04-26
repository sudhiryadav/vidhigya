import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 64, 175) 55%, rgb(37, 99, 235) 100%)",
          padding: "64px",
          color: "white",
          fontFamily: "Inter, sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              height: "52px",
              width: "52px",
              borderRadius: "12px",
              background: "white",
              color: "rgb(30, 64, 175)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            V
          </div>
          Vidhigya
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
            Legal Practice Management
          </div>
          <div style={{ fontSize: 32, opacity: 0.9 }}>
            Cases, clients, documents, billing, and hearings in one platform.
          </div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.85 }}>vidhigya.qurieus.com</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
