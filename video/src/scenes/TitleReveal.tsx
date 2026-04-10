import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";
import { STATS } from "../data/stats";

// Scene 1: Title Reveal — 90 frames / 3s
// "CC Commander" spring-scales in, tagline fades, orange rule slides, badge fades

export const TitleReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // Main title spring scale 0.8 → 1.0
  const titleScale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 12, mass: 0.5 },
  });

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline fades in at frame 30
  const taglineOpacity = interpolate(frame, [30, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineY = interpolate(frame, [30, 48], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orange rule slides in from left at frame 45
  const ruleWidth = interpolate(frame, [45, 72], [0, 560], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Version badge fades in at frame 60
  const badgeOpacity = interpolate(frame, [60, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cross-fade out over last 15 frames
  const sceneOpacity = interpolate(frame, [75, 90], [1, 0], {
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
        opacity: sceneOpacity,
      }}
    >
      {/* Subtle dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,102,0,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 400,
          background:
            "radial-gradient(ellipse, rgba(255,102,0,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Main title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 96,
            fontWeight: 800,
            color: "#e6edf3",
            letterSpacing: -3,
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          CC Commander
        </div>

        {/* Orange gradient rule */}
        <div
          style={{
            height: 3,
            width: ruleWidth,
            background: "linear-gradient(90deg, #ff6600, #58a6ff)",
            borderRadius: 2,
            marginBottom: 24,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 26,
            fontWeight: 400,
            color: "#8b949e",
            letterSpacing: 0.2,
            textAlign: "center",
            maxWidth: 680,
            lineHeight: 1.4,
          }}
        >
          Every Claude Code tool. One install. An AI brain that learns.
        </div>
      </div>

      {/* Version badge — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 80,
          opacity: badgeOpacity,
          background: "rgba(255,102,0,0.12)",
          border: "1px solid rgba(255,102,0,0.5)",
          borderRadius: 6,
          padding: "6px 18px",
          fontFamily: '"SF Mono", "Fira Code", monospace',
          fontSize: 16,
          color: "#ff6600",
          letterSpacing: 1,
        }}
      >
        {STATS.version}
      </div>
    </AbsoluteFill>
  );
};
