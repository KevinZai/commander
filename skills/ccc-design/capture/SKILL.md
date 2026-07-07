---
name: capture
description: Turn an existing reference (video, HTML page, or full-page screenshot) into reusable design prompts. Use when the user has a video/HTML/live-site reference and wants it analyzed and converted into a detailed recreation or inspiration prompt, or when full-page screenshots of scroll-animated/WebGL/lazy-loaded pages are failing.
user-invocable: true
args:
  - name: source
    description: Path/URL to the video, HTML file, or live page to capture (optional)
    required: false
---

# ccc-design / capture — Design capture workflows

> Adapted from [MengTo/Skills](https://github.com/MengTo/Skills) — MIT licensed. This is a **routing wrapper**, not a port — full workflows stay in `vendor/mengto-skills/`; each row below points at the source spec.

CCC's `frontend-design` covers *building* UI. This sub-skill covers *capturing* an existing reference (someone else's site, a screen recording, a mockup) and turning it into a reusable, screenshot-backed prompt — the missing "reverse" direction.

## What's inside

| Workflow | What it does | When to use | Vendor source |
|----------|---------------|--------------|----------------|
| `video-to-superprompt` | Analyzes a reference video (design, UI, animation, transitions, scroll interactions, typography, colors, WebGL) and writes a detailed recreation/inspiration prompt | User shares/uploads/links a video and wants the design or motion recreated | `vendor/mengto-skills/agent-skills/codex/video-to-superprompt/SKILL.md` |
| `html-to-interaction-prompts` | Converts an HTML page (supplied or generated) into a screenshot-backed article of multiple reusable interaction prompts | User has an HTML file/exported page/live reference and wants its animations/interactions extracted as reusable prompts | `vendor/mengto-skills/agent-skills/codex/html-to-interaction-prompts/SKILL.md` |
| `stitched-full-page-capture` | Produces reliable full-page screenshots for lazy-loaded, scroll-animated, Framer, WebGL/canvas, or reveal-heavy pages by using settled viewport captures instead of trusting a single scroll shot | Full-page screenshots come back blank/gray/sparse or disagree with a working scroll video | `vendor/mengto-skills/agent-skills/codex/stitched-full-page-capture/SKILL.md` |
| `daily-ui-inspiration-capture` | Recurring, dated UI-inspiration bundle workflow (Framer/Dribbble-style captures + AI-builder prompts, duplicate-checked) | User wants a repeatable inspiration-gathering runbook, not a one-off capture | `vendor/mengto-skills/agent-skills/codex/daily-ui-inspiration-capture/SKILL.md` |

**Companion (spec side, not capture):** `design-first-ui-prompting` (`vendor/mengto-skills/agent-skills/ui/design-first-ui-prompting/SKILL.md`) — turns a fuzzy idea into a tight, skimmable UI-generation spec. Pair it with any capture workflow above: capture extracts the reference, `design-first-ui-prompting` turns the extraction into a clean build prompt.

## How to use

1. Identify the source type — video, HTML/live page, or a broken full-page screenshot — and pick the matching row.
2. Read the full workflow at its vendor source path before running it; each has its own tool sequence and output format (usually a screenshot-backed markdown article).
3. If the goal is to *rebuild* the captured reference as working UI (not just document it), hand the resulting prompt to `frontend-design` or the plugin router's Sub-flow C (Screenshot → interactive UI).
4. If a `Design.md` soul exists for the current project, reconcile the captured reference against it — don't let a capture override the project's established tokens without confirming.

## Anti-patterns — DO NOT
- ❌ Pixel-trace the capture into a static clone — the output is a *prompt*, and any rebuild should be interactive + on-brand
- ❌ Skip `stitched-full-page-capture` and trust a single scroll screenshot on lazy-loaded/WebGL pages — it will be wrong
- ❌ Run capture workflows without reading the full vendor spec first — they have specific tool sequences (screenshot cadence, settle waits) that matter
