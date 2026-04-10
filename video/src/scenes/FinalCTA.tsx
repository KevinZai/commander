import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";
import { TypewriterText } from "../components/TypewriterText";
import { TerminalWindow } from "../components/TerminalWindow";
import { STATS } from "../data/stats";

// Scene 6: Final CTA — 120 frames / 4s
// Install command types in, CC Commander pulses, github fades in

export const FinalCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // "Get started in 60 seconds" types at frame 5
  const headlineOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Terminal window springs in at frame 20
  const terminalScale = spring({
    frame: Math.max(0, frame - 20),
    fps,
    from: 0.88,
    to: 1,
    config: { damping: 14, mass: 0.6 },
  });

  const terminalOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // install cmd types from frame 25
  const installDone = 25 + Math.ceil(STATS.installCmd.length / 1.2);
  // "$ ccc" types after install finishes
  const cccStart = installDone + 8;

  // Bottom title springs in at frame 70
  const logoScale = spring({
    frame: Math.max(0, frame - 70),
    fps,
    from: 0.85,
    to: 1,
    config: { damping: 10, mass: 0.5 },
  });

  const logoOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulsing glow
  const glowPulse = 0.5 + 0.5 * Math.sin(frame / 20);

  // GitHub link fades in at frame 85
  const githubOpacity = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Star badge at frame 95
  const starOpacity = interpolate(frame, [95, 108], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out over last 30 frames (frames 90-120)
  const sceneOpacity = interpolate(frame, [90, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        opacity: sceneOpacity,
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,102,0,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 350,
          background: `radial-gradient(ellipse, rgba(255,102,0,${0.05 + glowPulse * 0.04}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Headline */}
      <div
        style={{
          opacity: headlineOpacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 20,
          fontWeight: 500,
          color: "#8b949e",
          letterSpacing: 0.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        Get started in 60 seconds
      </div>

      {/* Terminal with install command */}
      <div
        style={{
          opacity: terminalOpacity,
          transform: `scale(${terminalScale})`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <TerminalWindow title="Terminal" width={620}>
          <div style={{ lineHeight: 2 }}>
            <div>
              <span style={{ color: "#484f58" }}>$ </span>
              {frame >= 25 && (
                <TypewriterText
                  text={STATS.installCmd}
                  startFrame={25}
                  fontSize={16}
                  fontWeight={400}
                  color="#3fb950"
                  showCursor={frame < installDone}
                  charsPerFrame={1.2}
                />
              )}
            </div>
            {frame >= cccStart && (
              <div style={{ marginTop: 4 }}>
                <span style={{ color: "#484f58" }}>$ </span>
                <TypewriterText
                  text="ccc"
                  startFrame={cccStart}
                  fontSize={16}
                  fontWeight={400}
                  color="#ff6600"
                  showCursor
                  charsPerFrame={1.5}
                />
              </div>
            )}
          </div>
        </TerminalWindow>
      </div>

      {/* CC Commander logo + pulsing glow */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 72,
          fontWeight: 800,
          color: "#ff6600",
          letterSpacing: -2,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          textShadow: `0 0 ${40 + glowPulse * 20}px rgba(255,102,0,${0.3 + glowPulse * 0.2})`,
        }}
      >
        CC Commander
      </div>

      {/* GitHub link */}
      <div
        style={{
          opacity: githubOpacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 18,
          fontWeight: 400,
          color: "#58a6ff",
          letterSpacing: 0.3,
          position: "relative",
          zIndex: 1,
        }}
      >
        {STATS.github}
      </div>

      {/* Star / social proof badge */}
      <div
        style={{
          opacity: starOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(88,166,255,0.08)",
          border: "1px solid rgba(88,166,255,0.25)",
          borderRadius: 20,
          padding: "8px 20px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 15,
          fontWeight: 500,
          color: "#8b949e",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span style={{ color: "#f0883e", fontSize: 18 }}>★</span>
        <span>Star on GitHub — it helps!</span>
      </div>
    </AbsoluteFill>
  );
};
