-- CC Commander Beta v4 — Survey Question Bank Seed
-- 20 questions rotate on SessionStart. Each user sees at most 1 per session.

INSERT INTO surveys (user_id, session_id, question_id, answer, version)
-- Seed rows are intentionally empty — this file seeds the question metadata via a separate table.
-- The question bank is stored in the application layer (site/lib/survey-bank.ts).
-- This file is kept as a reference / future migration to add a questions table.
SELECT NULL, NULL, NULL, NULL, NULL WHERE FALSE;

-- ─────────────────────────────────────────────
-- Survey question bank (reference only — served from survey-bank.ts)
-- ─────────────────────────────────────────────
-- Q1:  "How did you find CC Commander? (Twitter/X · GitHub · Reddit · A friend · Other)"
-- Q2:  "What's your primary use case for Commander? (Personal projects · Work projects · Learning · OSS contributions · Consulting clients)"
-- Q3:  "What IDE do you primarily use? (Claude Code CLI · Claude Desktop · Cursor · Windsurf · VS Code · Zed · Other)"
-- Q4:  "How long have you been using Claude Code? (< 1 month · 1–6 months · 6–12 months · 1+ year)"
-- Q5:  "Which CCC domain do you use most? (ccc-design · ccc-saas · ccc-devops · ccc-testing · ccc-security · ccc-marketing · Other)"
-- Q6:  "Roughly how many Claude Code sessions do you run per week? (1–3 · 4–10 · 11–20 · 20+)"
-- Q7:  "What's the most valuable thing Commander does for you? (Open text, 140 chars)"
-- Q8:  "What Commander feature do you use least? (Open text, 140 chars)"
-- Q9:  "How would you rate Commander overall? (1–5 stars)"
-- Q10: "If Commander disappeared tomorrow, how upset would you be? (Very upset · Somewhat upset · Not upset · Never used it seriously)"
-- Q11: "Would you recommend Commander to another Claude Code user? (Definitely · Probably · Probably not · Definitely not)"
-- Q12: "Are you aware that Commander has a Pro tier? (Yes · No)"
-- Q13: "Which features would make Pro worth it to you? (Agents · MCP servers · Hooks · Skill updates · Commander Hub access · All of the above)"
-- Q14: "What would you pay per month for unlimited Commander access? ($0 free-only · $5 · $10 · $19 · $29 · $50+)"
-- Q15: "Would you pay for a team/org license? (Yes, if priced right · Maybe · No)"
-- Q16: "Have you ever created your own Claude Code skill or agent? (Yes · No · Don't know how)"
-- Q17: "Would you publish skills to a Commander Hub community directory? (Yes · Maybe · No)"
-- Q18: "What Claude Code tool do you use alongside Commander? (ECC · gstack · Superpowers · RTK · None · Other)"
-- Q19: "Is Commander part of your daily development workflow? (Every session · Most sessions · Sometimes · Rarely)"
-- Q20: "What one thing would make Commander 2x more useful? (Open text, 280 chars)"
