import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 675,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at top right, rgb(59, 130, 246), rgb(15, 23, 42) 60%)",
          color: "white",
          fontFamily: "Inter, sans-serif",
          padding: "58px",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700 }}>Vidhigya</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 62, lineHeight: 1.07, fontWeight: 800 }}>
            Built for modern legal teams
          </div>
          <div style={{ fontSize: 30, opacity: 0.9 }}>
            Case management, legal billing, documents, and collaboration.
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.85 }}>Legal Practice Management Platform</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
