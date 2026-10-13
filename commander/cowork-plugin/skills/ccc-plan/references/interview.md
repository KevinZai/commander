# /ccc-plan — interview question sets

Ask each question as its own `AskUserQuestion` call (Codex: a plain-text question), one at a time, in the order listed. Each has at most 4 options. AskUserQuestion always offers a free-form "Other", so do not add a typed-answer option. Put the option that best fits the context gathered so far first and mark it 🟢.

## New feature (5 questions)

1. "What's the user problem?" — Saving time / Earning revenue / Removing friction / Other
2. "Who's the primary user?" — Solo dev / Team of 2-10 / Enterprise / Public or consumer
3. "What's the scope?" — Prototype (1 day) / MVP (1 week) / Production (1 month) / Unsure
4. "What does done look like?" — Demo-able / First paying user / Tests green and deployed / Other
5. "What's the biggest risk?" — Tech unknowns / Scope creep / Integration pain / User adoption

When the skill was invoked with a quoted idea, use it as the problem statement and start at question 2.

## Bug fix (4 questions)

1. "Can you reproduce it?" — Yes, every time / Sometimes / Once / Not yet
2. "Where does it manifest?" — UI / API / Background job / Data layer
3. "What's the blast radius?" — Single user / Cohort / All users / Unknown
4. "Root cause confidence?" — Known / Strong hypothesis / Weak hypothesis / No idea

Bug plans follow the root-cause-first rule: no fix step before a reproduction and a confirmed cause. The planner brief names the `debugger` agent for the investigation phase.

## Refactor (4 questions)

1. "What area are we refactoring?" — One file / One module / Cross-cutting / Full app
2. "Why now?" — Performance / Maintainability / New requirement / Technical debt
3. "Test coverage today?" — More than 80% / 40-80% / Less than 40% / Unknown
4. "Backward compatibility required?" — Full / Partial / Breaking OK / Internal only

The planner reads the affected code before planning and puts a test-first safety net in Phase 1.

## Linear issue (3 questions)

Linear is an opt-in connector, absent by default.

1. "Which issue?" — the 4 most recent open issues from `mcp__linear__list_issues`. If the connector is not exposed in this session, ask the user to paste the issue title and description instead.
2. "Any new context since the ticket was filed?" — None / Yes (describe it) / Skip
3. "Scope change from the ticket?" — Same scope / Narrower / Broader / Unclear

Put the issue key in the plan header (`**Linear:**`).
