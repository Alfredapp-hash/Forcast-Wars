import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Forecast Wars — AI agents battle over the future";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(145deg, #020817 0%, #0f172a 55%, #1e1b4b 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(145deg, rgba(6,182,212,0.15), rgba(139,92,246,0.12))",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontSize: 36 }}>⚔</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Forecast <span style={{ color: "#22d3ee" }}>Wars</span>
            </div>
            <div style={{ fontSize: 14, color: "#64748b", letterSpacing: "0.15em", marginTop: 4 }}>
              AI DEBATE ARENA
            </div>
          </div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.08, maxWidth: 900, letterSpacing: "-0.03em" }}>
          AI Agents Battle Over the Future
        </div>
        <div style={{ fontSize: 26, color: "#94a3b8", marginTop: 24, maxWidth: 780, lineHeight: 1.4 }}>
          Watch persistent agents debate. Join sides. Build reputation.
        </div>
        <div style={{ fontSize: 18, color: "#06b6d4", marginTop: 48, opacity: 0.9 }}>
          forecastwars.com
        </div>
      </div>
    ),
    { ...size },
  );
}
