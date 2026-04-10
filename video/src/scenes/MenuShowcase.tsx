import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { TerminalWindow } from "../components/TerminalWindow";

// Scene 3: Menu Showcase — 150 frames / 5s
// Real main-menu.png inside TerminalWindow chrome
// Floating labels stagger in with springs

interface FloatingLabel {
  text: string;
  startFrame: number;
  top: number;
}

const LABELS: FloatingLabel[] = [
  { text: "Arrow-key navigation", startFrame: 40, top: 180 },
  { text: "450+ skills", startFrame: 55, top: 290 },
  { text: "11 CCC domains", startFrame: 70, top: 400 },
  { text: "Night Mode / YOLO", startFrame: 85, top: 510 },
];

const FloatingLabel: React.FC<FloatingLabel & { frame: number }> = ({
  text,
  startFrame,
  top,
  frame,
}) => {
  const fps = 30;
  const elapsed = Math.max(0, frame - startFrame);

  const scale = spring({
    frame: elapsed,
    fps,
    from: 0.85,
    to: 1,
    config: { damping: 14, mass: 0.5 },
  });

  const opacity = interpolate(elapsed, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const x = interpolate(elapsed, [0, 18], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        position: "absolute",
        top,
        right: 0,
        opacity,
        transform: `translateX(${x}px) scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: "#ff6600",
          flexShrink: 0,
          boxShadow: "0 0 8px rgba(255,102,0,0.6)",
        }}
      />
      <div
        style={{
          background: "rgba(22,27,34,0.9)",
          border: "1px solid rgba(255,102,0,0.3)",
          borderRadius: 6,
          padding: "6px 14px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 15,
          fontWeight: 500,
          color: "#e6edf3",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const MenuShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  // Section label fades in 0-15
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Screenshot springs in at frame 10
  const screenScale = spring({
    frame: Math.max(0, frame - 10),
    fps,
    from: 0.9,
    to: 1,
    config: { damping: 16, mass: 0.6 },
  });

  const screenOpacity = interpolate(frame, [10, 28], [0, 1], {
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
        padding: "60px 80px",
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
          opacity: labelOpacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#ff6600",
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 32,
          position: "relative",
          zIndex: 1,
        }}
      >
        Interactive CLI
      </div>

      {/* Main content row: terminal + labels */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 60,
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1400,
        }}
      >
        {/* Terminal window with screenshot */}
        <div
          style={{
            flex: "0 0 auto",
            opacity: screenOpacity,
            transform: `scale(${screenScale})`,
            transformOrigin: "top left",
          }}
        >
          <TerminalWindow title="ccc — CC Commander" width={820}>
            {/* @ts-expect-error Remotion overrides img types */}
            <img
              src={staticFile("main-menu.png")}
              alt="CC Commander main menu"
              style={{
                display: "block",
                margin: "-24px -28px",
                width: "calc(100% + 56px)",
              }}
            />
          </TerminalWindow>
        </div>

        {/* Floating labels — right side */}
        <div
          style={{
            flex: 1,
            position: "relative",
            height: 700,
          }}
        >
          {LABELS.map((label) => (
            <FloatingLabel key={label.text} {...label} frame={frame} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
