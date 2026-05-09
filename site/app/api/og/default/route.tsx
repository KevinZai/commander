import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F0F0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #8B5CF6, #D946EF)",
            }}
          />
          <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700 }}>
            CC Commander
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: "32px",
          }}
        >
          The curated Claude Code plugin.
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            marginBottom: "48px",
          }}
        >
          {[
            { value: "62", label: "skills" },
            { value: "22", label: "agents" },
            { value: "9", label: "hooks" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{ color: "#FF6B47", fontSize: "48px", fontWeight: 800 }}
              >
                {s.value}
              </span>
              <span style={{ color: "#71717A", fontSize: "24px" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            padding: "16px 48px",
            background: "#FF6B47",
            borderRadius: "12px",
            color: "#ffffff",
            fontSize: "28px",
            fontWeight: 700,
          }}
        >
          Free forever · Install in 10 seconds
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
