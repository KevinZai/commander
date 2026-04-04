import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { TypeWriter } from "../components/TypeWriter";
import { FadeIn } from "../components/FadeIn";
import { STATS } from "../data/stats";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation — slides up + fades in
  const titleProgress = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const titleY = interpolate(titleProgress, [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Subtitle stagger
  const subOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [15, 30], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Glow pulse
  const glowIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [20, 40]);

  const taglineStart = 40;
  const badgeStart = 80;
  const statsStart = 95;

  return (
    <AbsoluteFill style={{ background: "#0d1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      {/* Subtle grid background */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(80,255,120,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(80,255,120,0.3) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Main title — CCC */}
      <div style={{
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        textAlign: "center",
        marginBottom: 8,
      }}>
        <div style={{
          fontSize: 180,
          fontWeight: 900,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 24,
          color: "#50FF78",
          textShadow: `0 0 ${glowIntensity}px rgba(80,255,120,0.6), 0 0 ${glowIntensity * 2}px rgba(80,255,120,0.3)`,
        }}>
          CCC
        </div>
      </div>

      {/* Product name */}
      <div style={{
        opacity: subOpacity,
        transform: `translateY(${subY}px)`,
        fontSize: 32,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        color: "#c9d1d9",
        letterSpacing: 8,
        textTransform: "uppercase",
        marginBottom: 24,
      }}>
        CC Commander
      </div>

      {/* Tagline — types out */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 22,
        color: "#8b949e",
        textAlign: "center",
        minHeight: 32,
      }}>
        {frame >= taglineStart && (
          <TypeWriter
            text="Every Claude Code tool. One install. Guided access."
            startFrame={taglineStart}
            durationFrames={50}
            color="#8b949e"
          />
        )}
      </div>

      {/* Version + stats */}
      {frame >= badgeStart && (
        <FadeIn startFrame={badgeStart} durationFrames={15}>
          <div style={{
            display: "flex", gap: 16, marginTop: 24, alignItems: "center",
          }}>
            <div style={{
              background: "rgba(80,255,120,0.1)", border: "1px solid rgba(80,255,120,0.4)",
              borderRadius: 6, padding: "6px 16px",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: "#50FF78",
            }}>
              {STATS.version}
            </div>
            {frame >= statsStart && (
              <>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#484f58" }}>
                  {STATS.skills} skills
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#484f58" }}>
                  ·
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#484f58" }}>
                  {STATS.vendors} vendors
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#484f58" }}>
                  ·
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#484f58" }}>
                  Opus plans · Sonnet builds
                </span>
              </>
            )}
          </div>
        </FadeIn>
      )}
    </AbsoluteFill>
  );
};
