import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";
import { STATS } from "../data/stats";

// Scene 5: Stats Grid — 120 frames / 4s
// 2×3 grid of stat cards, animated counters, spring stagger

interface StatCard {
  label: string;
  value: number;
  suffix: string;
  color: string;
  startFrame: number;
}

const STAT_CARDS: StatCard[] = [
  { label: "Skills", value: STATS.skills, suffix: "+", color: "#ff6600", startFrame: 10 },
  { label: "Vendors", value: STATS.vendors, suffix: "", color: "#58a6ff", startFrame: 20 },
  { label: "Domains", value: STATS.domains, suffix: "", color: "#3fb950", startFrame: 30 },
  { label: "Tests", value: STATS.tests, suffix: "", color: "#e6edf3", startFrame: 40 },
  { label: "Audit Score", value: STATS.auditScore, suffix: "/100", color: "#f0883e", startFrame: 50 },
  { label: "Themes", value: STATS.themes, suffix: "", color: "#bc8cff", startFrame: 60 },
];

const AnimatedCard: React.FC<StatCard & { frame: number }> = ({
  label,
  value,
  suffix,
  color,
  startFrame,
  frame,
}) => {
  const fps = 30;
  const elapsed = Math.max(0, frame - startFrame);

  const cardScale = spring({
    frame: elapsed,
    fps,
    from: 0.82,
    to: 1,
    config: { damping: 12, mass: 0.5 },
  });

  const cardOpacity = interpolate(elapsed, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const countDuration = 35;
  const current = Math.floor(
    interpolate(elapsed, [0, countDuration], [0, value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity: cardOpacity,
        transform: `scale(${cardScale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 28px",
        border: "1px solid #21262d",
        background: "rgba(22,27,34,0.7)",
        borderRadius: 10,
        gap: 10,
        backdropFilter: "blur(12px)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div
        style={{
          fontFamily: '"SF Mono", "Fira Code", monospace',
          fontSize: 56,
          fontWeight: 700,
          color,
          lineHeight: 1,
          letterSpacing: -1,
        }}
      >
        {current}
        <span style={{ fontSize: 28, fontWeight: 600 }}>{suffix}</span>
      </div>
      <div
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: "#484f58",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const StatsReveal: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cross-fade out last 15 frames
  const sceneOpacity = interpolate(frame, [105, 120], [1, 0], {
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
        gap: 48,
        opacity: sceneOpacity,
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,102,0,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />

      {/* Section label */}
      <div
        style={{
          opacity: titleOpacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#ff6600",
          letterSpacing: 3,
          textTransform: "uppercase",
          position: "relative",
          zIndex: 1,
        }}
      >
        By the numbers
      </div>

      {/* 3×2 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 260px)",
          gap: 2,
          position: "relative",
          zIndex: 1,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #21262d",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {STAT_CARDS.map((card) => (
          <AnimatedCard key={card.label} {...card} frame={frame} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
