export type SurveyQuestion = {
  id: number;
  text: string;
  type: "choice" | "text";
  options?: string[];
  maxChars?: number;
  category: "onboarding" | "usage" | "quality" | "pricing" | "community" | "longitudinal";
};

export const SURVEY_BANK: SurveyQuestion[] = [
  // Onboarding & Discovery (Q1–Q4)
  {
    id: 1,
    text: "How did you find CC Commander?",
    type: "choice",
    options: ["Twitter/X", "GitHub", "Reddit", "A friend", "Other"],
    category: "onboarding",
  },
  {
    id: 2,
    text: "What's your primary use case for Commander?",
    type: "choice",
    options: ["Personal projects", "Work projects", "Learning", "OSS contributions", "Consulting clients"],
    category: "onboarding",
  },
  {
    id: 3,
    text: "What IDE do you primarily use?",
    type: "choice",
    options: ["Claude Code CLI", "Claude Desktop", "Cursor", "Windsurf", "VS Code", "Zed", "Other"],
    category: "onboarding",
  },
  {
    id: 4,
    text: "How long have you been using Claude Code?",
    type: "choice",
    options: ["< 1 month", "1–6 months", "6–12 months", "1+ year"],
    category: "onboarding",
  },

  // Usage & Behavior (Q5–Q8)
  {
    id: 5,
    text: "Which CCC domain do you use most?",
    type: "choice",
    options: ["ccc-design", "ccc-saas", "ccc-devops", "ccc-testing", "ccc-security", "ccc-marketing", "Other"],
    category: "usage",
  },
  {
    id: 6,
    text: "Roughly how many Claude Code sessions do you run per week?",
    type: "choice",
    options: ["1–3", "4–10", "11–20", "20+"],
    category: "usage",
  },
  {
    id: 7,
    text: "What's the most valuable thing Commander does for you?",
    type: "text",
    maxChars: 140,
    category: "usage",
  },
  {
    id: 8,
    text: "What Commander feature do you use least?",
    type: "text",
    maxChars: 140,
    category: "usage",
  },

  // Quality & Satisfaction (Q9–Q11)
  {
    id: 9,
    text: "How would you rate Commander overall?",
    type: "choice",
    options: ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"],
    category: "quality",
  },
  {
    id: 10,
    text: "If Commander disappeared tomorrow, how upset would you be?",
    type: "choice",
    options: ["Very upset", "Somewhat upset", "Not upset", "Never used it seriously"],
    category: "quality",
  },
  {
    id: 11,
    text: "Would you recommend Commander to another Claude Code user?",
    type: "choice",
    options: ["Definitely", "Probably", "Probably not", "Definitely not"],
    category: "quality",
  },

  // Pricing & Willingness-to-Pay (Q12–Q15)
  {
    id: 12,
    text: "Are you aware that Commander has a Pro tier?",
    type: "choice",
    options: ["Yes", "No"],
    category: "pricing",
  },
  {
    id: 13,
    text: "Which features would make Pro worth it to you?",
    type: "choice",
    options: ["Agents", "MCP servers", "Hooks", "Skill updates", "Commander Hub access", "All of the above"],
    category: "pricing",
  },
  {
    id: 14,
    text: "What would you pay per month for unlimited Commander access?",
    type: "choice",
    options: ["$0 free-only", "$5", "$10", "$19", "$29", "$50+"],
    category: "pricing",
  },
  {
    id: 15,
    text: "Would you pay for a team/org license?",
    type: "choice",
    options: ["Yes, if priced right", "Maybe", "No"],
    category: "pricing",
  },

  // Community & Ecosystem (Q16–Q18)
  {
    id: 16,
    text: "Have you ever created your own Claude Code skill or agent?",
    type: "choice",
    options: ["Yes", "No", "Don't know how"],
    category: "community",
  },
  {
    id: 17,
    text: "Would you publish skills to a Commander Hub community directory?",
    type: "choice",
    options: ["Yes", "Maybe", "No"],
    category: "community",
  },
  {
    id: 18,
    text: "What Claude Code tool do you use alongside Commander?",
    type: "choice",
    options: ["ECC", "gstack", "Superpowers", "RTK", "None", "Other"],
    category: "community",
  },

  // Longitudinal (Q19–Q20)
  {
    id: 19,
    text: "Is Commander part of your daily development workflow?",
    type: "choice",
    options: ["Every session", "Most sessions", "Sometimes", "Rarely"],
    category: "longitudinal",
  },
  {
    id: 20,
    text: "What one thing would make Commander 2x more useful?",
    type: "text",
    maxChars: 280,
    category: "longitudinal",
  },
];

/** Returns 5 random questions from the bank, seeded by userId for consistency within a session. */
export function selectRandomQuestions(userId: string, count = 5): SurveyQuestion[] {
  // Simple deterministic shuffle based on userId hash
  let seed = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...SURVEY_BANK].sort(() => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed & 1) ? 1 : -1;
  });
  return shuffled.slice(0, count);
}
