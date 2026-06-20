import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          color: "#f4f8fb",
          background: "linear-gradient(135deg, #004155 0%, #11b8aa 48%, #f5509d 100%)"
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase", color: "#11b8aa" }}>
          Premium serialized fiction
        </div>
        <div style={{ marginTop: 28, fontSize: 86, fontWeight: 700 }}>Velora Fiction</div>
        <div style={{ marginTop: 24, maxWidth: 820, fontSize: 34, lineHeight: 1.35, color: "rgba(255,250,242,0.72)" }}>
          Monetized chapters, virtual coins, protected reading, and author analytics.
        </div>
      </div>
    ),
    size
  );
}
