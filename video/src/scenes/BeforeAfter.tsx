import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, staticFile } from "remotion";

// Scene 2: Before/After — 150 frames / 5s
// Left: dim stock terminal. Right: vibrant cockpit screenshot springs in.
// Bottom: key pitch line types in.

export const BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // Fade in
  const sceneIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Left panel: stock terminal appears 0-50
  const leftOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Right panel: CCC screenshot springs in at frame 50
  const rightScale = spring({
    frame: Math.max(0, frame - 50),
    fps,
    from: 0.88,
    to: 1,
    config: { damping: 14, mass: 0.6 },
  });

  const rightOpacity = interpolate(frame, [50, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow behind right panel
  const glowOpacity = interpolate(frame, [65, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom pitch text at frame 100-135
  const pitchOpacity = interpolate(frame, [100, 118], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pitchY = interpolate(frame, [100, 118], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cross-fade out last 15 frames
  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0d1117",
        opacity: Math.min(sceneIn, sceneOpacity),
      }}
    >
      {/* Two-panel layout */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          padding: "80px 100px 140px",
        }}
      >
        {/* LEFT: Stock Claude Code mockup */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: leftOpacity,
          }}
        >
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#484f58",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Stock Claude Code
          </div>
          <div
            style={{
              width: "100%",
              background: "#161b22",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #21262d",
              boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* Title bar */}
            <div
              style={{
                background: "#1c2128",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: "1px solid #21262d",
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3d4450" }} />
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3d4450" }} />
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3d4450" }} />
              <span
                style={{
                  marginLeft: "auto",
                  marginRight: "auto",
                  color: "#3d4450",
                  fontSize: 12,
                  fontFamily: '"SF Mono", monospace',
                }}
              >
                Terminal
              </span>
            </div>
            {/* Dim content */}
            <div
              style={{
                padding: "20px 24px",
                fontFamily: '"SF Mono", "Fira Code", monospace',
                fontSize: 14,
                lineHeight: 1.8,
                color: "#484f58",
              }}
            >
              <div>$ claude</div>
              <div style={{ marginTop: 8 }}>
                <span style={{ color: "#3d4450" }}>╭─</span>
                <span style={{ color: "#484f58" }}> Claude Code</span>
              </div>
              <div>
                <span style={{ color: "#3d4450" }}>│</span>
                <span style={{ color: "#484f58" }}> No tools loaded</span>
              </div>
              <div>
                <span style={{ color: "#3d4450" }}>│</span>
                <span style={{ color: "#484f58" }}> No skills active</span>
              </div>
              <div>
                <span style={{ color: "#3d4450" }}>│</span>
                <span style={{ color: "#484f58" }}> Default behavior only</span>
              </div>
              <div>
                <span style={{ color: "#3d4450" }}>╰─</span>
              </div>
              <div style={{ marginTop: 12, color: "#3d4450" }}>
                {">"} What can I help you with?
              </div>
              <div style={{ marginTop: 8, color: "#3d4450" }}>▋</div>
            </div>
          </div>
        </div>

        {/* RIGHT: CC Commander cockpit screenshot */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: rightOpacity,
            transform: `scale(${rightScale})`,
            position: "relative",
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "110%",
              height: "110%",
              background:
                "radial-gradient(ellipse, rgba(255,102,0,0.12) 0%, transparent 65%)",
              opacity: glowOpacity,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#ff6600",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
              position: "relative",
              zIndex: 1,
            }}
          >
            With CC Commander
          </div>
          <div
            style={{
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,102,0,0.25)",
              boxShadow:
                "0 12px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,102,0,0.08)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* @ts-expect-error Remotion overrides img types */}
            <img
              src={staticFile("cockpit-footer.png")}
              alt="CC Commander cockpit footer"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        </div>
      </div>

      {/* Bottom pitch line */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: pitchOpacity,
          transform: `translateY(${pitchY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: "#e6edf3",
            letterSpacing: 0.5,
          }}
        >
          <span style={{ color: "#ff6600" }}>450+ skills.</span>
          {"  "}
          <span style={{ color: "#58a6ff" }}>19 vendors.</span>
          {"  "}
          <span style={{ color: "#3fb950" }}>Zero setup.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
