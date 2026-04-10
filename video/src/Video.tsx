import React from "react";
import { Series, AbsoluteFill } from "remotion";
import { TitleReveal } from "./scenes/TitleReveal";
import { BeforeAfter } from "./scenes/BeforeAfter";
import { MenuShowcase } from "./scenes/MenuShowcase";
import { CockpitShowcase } from "./scenes/CockpitShowcase";
import { StatsReveal } from "./scenes/StatsReveal";
import { FinalCTA } from "./scenes/FinalCTA";

// 6-scene cinematic hero video
// Total: 900 frames = 30 seconds at 30fps
const SCENES = [
  { component: TitleReveal, frames: 90 },     // Scene 1: Title Reveal        3s
  { component: BeforeAfter, frames: 150 },    // Scene 2: Before/After        5s
  { component: MenuShowcase, frames: 150 },   // Scene 3: Menu Showcase       5s
  { component: CockpitShowcase, frames: 150 }, // Scene 4: Cockpit Dashboard   5s
  { component: StatsReveal, frames: 120 },    // Scene 5: Stats Grid          4s
  { component: FinalCTA, frames: 120 },       // Scene 6: Install + CTA       4s
] as const;

export const TOTAL_FRAMES = SCENES.reduce((sum, s) => sum + s.frames, 0); // 900

export const Hero: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      <Series>
        {SCENES.map(({ component: SceneComponent, frames }, i) => (
          <Series.Sequence key={i} durationInFrames={frames}>
            <AbsoluteFill>
              <SceneComponent />
            </AbsoluteFill>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
