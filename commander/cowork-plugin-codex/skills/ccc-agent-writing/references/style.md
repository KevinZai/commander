# Writing style checks

Reference for `/ccc-agent-writing` steps 4 to 6.

## Lead with the answer

The first sentence answers "what is this and why do I care?"

- ❌ "This PR refactors the authentication module to improve code quality and make future changes easier."
- ✅ "Fixes a race condition in `/login` that created duplicate sessions under concurrent requests."

## Scanability

Reviewers scan before they read. The document should make sense at scan speed:

1. Every section header is a complete thought, not a label.
2. Every non-trivial concept has a code example.
3. Lists of three or more items are bullets.
4. Comparisons are tables.
5. The load-bearing words in each paragraph are bold.

## Persuasion for specs and PRDs (AIDA)

Use when the document needs stakeholder buy-in. The examples are illustrative; use numbers measured from the user's own data and flag any you cannot source.

| Stage | What it does | Example |
|---|---|---|
| **Attention** | Name the pain | "Users abandon onboarding at step 3 — 47% drop-off" |
| **Interest** | Show the opportunity | "One change cuts this to 12% (competitor benchmark)" |
| **Desire** | Connect to goals | "This recovers ~$8K MRR at current conversion rate" |
| **Action** | Clear ask | "Approve spec by Friday to hit Q2 sprint" |

## Common mistakes

| Mistake | Fix |
|---|---|
| Jargon without definition | First use in **bold** with an inline definition |
| Passive voice | Active: "the server returns X", not "X is returned by the server" |
| Buried lede | Move the conclusion to sentence 1 |
| "Simply" / "just" / "obviously" | Delete; they read as condescending |
| No acceptance criteria | Every spec needs Given/When/Then |
| PR description restates the git log | Explain why, not only what changed |
