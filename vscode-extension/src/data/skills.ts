import catalog from './skills.generated.json';

export interface Skill {
  id: string;
  name: string;
  description: string;
  command?: string;
}

// Generated from commander/cowork-plugin/skills/*/SKILL.md by
// scripts/generate-skills.js (npm run gen:skills). Do not edit the JSON by hand.
export const skills: Skill[] = catalog as Skill[];
