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
        <div
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: "#71717A",
            textTransform: "uppercase",
            letterSpacing: "8px",
            marginBottom: "40px",
          }}
        >
          CC Commander · Pricing
        </div>

        <div
          style={{
            display: "flex",
            gap: "40px",
            marginBottom: "48px",
          }}
        >
          {[
            { name: "Starter", price: "$0", sub: "free forever", highlight: false },
            { name: "Pro", price: "$19", sub: "per month", highlight: true },
            { name: "Lifetime", price: "$299", sub: "one-time", highlight: false },
          ].map((tier) => (
            <div
              key={tier.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 48px",
                borderRadius: "16px",
                border: tier.highlight ? "2px solid #8B5CF6" : "2px solid #27272A",
                background: tier.highlight ? "rgba(139,92,246,0.1)" : "rgba(24,24,27,0.8)",
                gap: "8px",
              }}
            >
              <span style={{ color: "#A1A1AA", fontSize: "22px", fontWeight: 600 }}>
                {tier.name}
              </span>
              <span
                style={{
                  color: tier.highlight ? "#C084FC" : "#ffffff",
                  fontSize: "56px",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {tier.price}
              </span>
              <span style={{ color: "#52525B", fontSize: "20px" }}>{tier.sub}</span>
            </div>
          ))}
        </div>

        <div style={{ color: "#52525B", fontSize: "24px" }}>
          cc-commander.com/pricing
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
