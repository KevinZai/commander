import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  staticFile,
} from "remotion";

// Scene 4: Cockpit Dashboard — 150 frames / 5s
// Two screenshots slide up with springs, feature callouts stagger in

interface Callout {
  text: string;
  startFrame: number;
  color: string;
}

const CALLOUTS: Callout[] = [
  { text: "Live context meters", startFrame: 60, color: "#58a6ff" },
  { text: "Rate limit tracking", startFrame: 75, color: "#3fb950" },
  { text: "Cost monitoring", startFrame: 90, color: "#ff6600" },
  { text: "Streak & gamification", startFrame: 105, color: "#f0883e" },
];

const CalloutBadge: React.FC<Callout & { frame: number }> = ({
  text,
  startFrame,
  color,
  frame,
}) => {
  const fps = 30;
  const elapsed = Math.max(0, frame - startFrame);

  const scale = spring({
    frame: elapsed,
    fps,
    from: 0.85,
    to: 1,
    config: { damping: 12, mass: 0.5 },
  });

  const opacity = interpolate(elapsed, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(22,27,34,0.8)",
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: "8px 16px",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 15,
        fontWeight: 500,
        color: "#e6edf3",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: color,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      {text}
    </div>
  );
};

export const CockpitShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // Section label
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Top screenshot (cockpit-status) slides up at frame 10
  const topSlide = spring({
    frame: Math.max(0, frame - 10),
    fps,
    from: 0,
    to: 1,
    config: { damping: 16, mass: 0.7 },
  });
  const topTranslate = interpolate(topSlide, [0, 1], [60, 0]);

  const topOpacity = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom screenshot (dashboard) slides up at frame 40
  const bottomSlide = spring({
    frame: Math.max(0, frame - 40),
    fps,
    from: 0,
    to: 1,
    config: { damping: 16, mass: 0.7 },
  });
  const bottomTranslate = interpolate(bottomSlide, [0, 1], [60, 0]);

  const bottomOpacity = interpolate(frame, [40, 58], [0, 1], {
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: sceneOpacity,
        padding: "50px 80px",
        gap: 32,
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(88,166,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />

      {/* Section label */}
      <div
        style={{
          opacity: labelOpacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#58a6ff",
          letterSpacing: 3,
          textTransform: "uppercase",
          position: "relative",
          zIndex: 1,
        }}
      >
        Mission Control
      </div>

      {/* Screenshots side by side */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 32,
          width: "100%",
          maxWidth: 1400,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* cockpit-status screenshot */}
        <div
          style={{
            flex: 1,
            opacity: topOpacity,
            transform: `translateY(${topTranslate}px)`,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(88,166,255,0.2)",
            boxShadow: "0 16px 60px rgba(0,0,0,0.5), 0 0 30px rgba(88,166,255,0.06)",
          }}
        >
          {/* @ts-expect-error Remotion overrides img types */}
          <img
            src={staticFile("cockpit-status.png")}
            alt="CC Commander cockpit status"
            style={{ width: "100%", display: "block" }}
          />
        </div>

        {/* dashboard screenshot */}
        <div
          style={{
            flex: 1,
            opacity: bottomOpacity,
            transform: `translateY(${bottomTranslate}px)`,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(88,166,255,0.2)",
            boxShadow: "0 16px 60px rgba(0,0,0,0.5), 0 0 30px rgba(88,166,255,0.06)",
          }}
        >
          {/* @ts-expect-error Remotion overrides img types */}
          <img
            src={staticFile("dashboard.png")}
            alt="CC Commander dashboard"
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Feature callout badges */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {CALLOUTS.map((c) => (
          <CalloutBadge key={c.text} {...c} frame={frame} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
