---
name: ccc-design
description: "UI design: landing pages, component systems, polish passes, Figma to code, screenshot to UI. Use to design, restyle, polish or animate a UI."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - Skill
  - AskUserQuestion
  - mcp__Shadcn_UI__list_blocks
  - mcp__Shadcn_UI__get_block
  - mcp__Shadcn_UI__get_component
  - mcp__figma
argument-hint: "[landing | components | polish | figma | chat | design-md | screenshot]"
model: inherit
effort: medium
---

# $ccc-design — pick the design job

**CC Commander** · $ccc-design · one click from intent to the right design method, agent or sub-skill.

The user's selected model is preserved. Long-form UI builds go to the plugin's `designer` agent in the background; shorter passes run inline.

Design sub-skills (`design-context`, `critique`, `polish`, `looks`, `capture` and the rest) ship with the Commander CLI toolkit. Invoke one with the Skill tool when it is listed in this session; otherwise apply its method from [references/routing.md](references/routing.md). The `frontend-design` skill is used the same way when installed.

Codex: ask pickers as plain-text questions and run agent work inline or with `codex exec --json`.

## When to use / when not to

- Use for new UI, a visual refresh, motion, a design system, Figma import, a chat interface, or capturing a product's look in `Design.md`.
- Use `$ccc-build` to scaffold a whole new project, `$ccc-mobile` for native mobile UI, `$ccc-makeover` for a whole-project health overhaul.

## What happens

### 1. Context strip

Run in one Bash call, silent on failure:

```bash
test -f package.json && jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' package.json 2>/dev/null | grep -E '^(next|react|vue|svelte|astro|tailwindcss|@tailwindcss/.*)$'
ls src/components 2>/dev/null | wc -l
ls tailwind.config.* 2>/dev/null
test -f Design.md && echo design-md
git rev-parse --abbrev-ref HEAD 2>/dev/null
git diff --stat HEAD 2>/dev/null | tail -1
claude mcp list 2>/dev/null | grep -iE 'figma|shadcn'
```

Render one line:

> 🎨 Stack: `<Next.js | React | Vue | HTML | unknown>` · <N> components · <Tailwind | plain CSS> · Design.md <yes | no> · branch `<name>`

No project: "🎨 No project yet — I'll scaffold one after you pick a direction."

### 2. Route by intent, or ask

Skip the picker when intent is already clear:

| Signal | Go to |
|---|---|
| Argument `landing`, `components`, `polish`, `figma` | the matching branch in step 3 |
| Chat UI, AI assistant interface, support widget, `chat` | Sub-flow A |
| `Design.md`, "capture our look", "apply our design soul", `design-md` | Sub-flow B |
| A screenshot or mockup is attached, `screenshot` | Sub-flow C |
| Named look, motion, particles, slides and other specific asks | the route in [references/routing.md](references/routing.md) |

Otherwise read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-design.json` once and ask with AskUserQuestion (header "Design", question "What design work?"), using its four non-back choices. Put the recommended option first, marked 🟢:

- 🚀 Landing page — hero, social proof, CTA stack; built by the `designer` agent in the background.
- 🏗️ Component system — shadcn-style library with tokens and variants.
- 🔧 Polish pass — spacing, contrast, motion and accessibility via the Impeccable suite.
- 🎨 Figma → code — production React + Tailwind from a Figma URL. Append "⚠️ needs connect" when no figma MCP server is listed.

Recommendation, first match wins:

- `git diff --stat` shows CSS/JSX/TSX churn on this branch → 🟢 Polish pass.
- Fewer than 3 components in `src/components` → 🟢 Component system.
- Empty or near-empty repo, or landing-page files recently touched → 🟢 Landing page.
- Otherwise → 🟢 Polish pass.

Dispatch the selection immediately; do not re-prompt.

### 3. Branches

**Landing page.** Call the Agent tool with `subagent_type: designer`, `run_in_background: true`, `description: "Build landing page"`, and a prompt carrying `{ type: "landing-page", stack: <detected>, brand_context: <Design.md tokens, or "ask the user"> }` plus: write only inside the project's pages/components directories, and return `{ files_changed, run_commands, open_questions }`. Run one landing agent at a time. Without the Agent tool, run inline: `design-context` → `landing-page-builder` → `interactive-landing` → `framer-motion-patterns` → `polish`.

**Component system.** Run inline: `design-context` → `frontend-design` → `design-consultation` → `colorize` → `typeset` → `normalize`. Write tokens to the project's existing token location (Tailwind config or CSS custom properties); create one only if none exists.

**Polish pass.** Run `critique` and list the findings. Then ask with AskUserQuestion (header "Direction"), recommended first:

- 🟢 the direction the critique supports — Bolder impact (`bolder`, `overdrive`) or Quieter (`quieter`, `distill`)
- the other direction
- Neither — keep the current intensity and only fix the findings

Continue: `clarify` → `arrange` → `typeset` → `adapt` → `polish`.

**Figma → code.** If `claude mcp list` shows no figma server, suggest `$ccc-connect figma` and stop. Otherwise ask for the Figma URL, read the file with the figma server's `mcp__figma__*` tools (pre-approved when the server is named `figma`, as `$ccc-connect figma` registers it; under any other name its tools run only when the user grants them at the permission prompt), and route to `frontend-design` + `adapt`.

### Sub-flow A — Chat UI

1. Pull real components. With the shadcn MCP connected, use `mcp__Shadcn_UI__list_blocks`, `mcp__Shadcn_UI__get_block` and `mcp__Shadcn_UI__get_component` to fetch the `chat-interface` blocks: message list, user/assistant bubbles, composer with send, streaming/typing indicator, scroll-to-bottom, optional thread sidebar. Without it, suggest `$ccc-connect shadcn`, then scaffold the same primitives by hand.
2. Compose `ChatPanel` + `MessageList` + `Composer`. Streaming, auto-scroll and the empty state are first-class.
3. If `Design.md` exists, apply its tokens before final styling.
4. Run the `polish` pass on bubble and composer spacing, contrast and motion.

### Sub-flow B — Design.md (capture or apply)

Ask with AskUserQuestion (header "Design soul"):

- 🟢 Capture — scan the current UI and write `Design.md` (recommended when none exists)
- Apply — load an existing `Design.md` and bind every new component to it (recommended when one exists; list it first then)

**Capture:** inspect `tailwind.config.*`, global CSS custom properties, font imports and a few representative components. Write `Design.md` at the repo root with four sections: Typography (families, scale, weights, line-height), Color (named tokens + hex + roles: bg, fg, primary, accent, border, muted), Spacing (base unit, scale, radius, shadow), Voice/Mood (one paragraph). If `Design.md` already exists, confirm with a picker (🟢 Keep the existing file · Overwrite it · Write `Design.draft.md` instead) before writing.

**Apply:** read `Design.md` and treat its tokens as binding for every component and edit in this session; pass them as `brand_context` to any `designer` agent. No `Design.md`: offer Capture first.

### Sub-flow C — Screenshot → interactive UI (+ optional onboarding video)

1. Read the image with Read; describe regions, components, type scale, color and spacing rhythm.
2. If `Design.md` exists, reconcile the observed styles against its tokens so the rebuild is on-brand, not a pixel trace.
3. Call the Agent tool with `subagent_type: designer`, `run_in_background: true`, payload `{ type: "screenshot-to-ui", stack: <detected>, brand_context: <Design.md tokens or "ask"> }`: production React + Tailwind with hover/focus/active states and responsive breakpoints.
4. Ask with AskUserQuestion: 🟢 UI only · Also make an onboarding video. On the video, invoke the `remotion` skill for a captioned walkthrough (intro → feature beats → CTA) exported to MP4, with fonts and colors taken from `Design.md`.

## Done when

Run before reporting, and report the actual result:

- Code changed: the project's build or typecheck exits 0 (`npm run build`, or `npx tsc --noEmit` when there is no build script), and `git status --short` lists only the files the branch was meant to touch. An agent's `files_changed` is checked against that list by the lead.
- Polish pass: the critique findings are listed with fixed / not fixed for each.
- `Design.md`: `grep -c '^## ' Design.md` shows the four sections.
- Video: the MP4 path the `remotion` render printed exists (`ls -la <path>`).

## Guardrails

- Never list the sub-skills as a typed menu; pickers have at most four options.
- Never overwrite an existing `Design.md` without the confirm picker.
- Never hand-roll chat bubbles or composers when the shadcn `chat-interface` block is available.
- Never pixel-trace a screenshot into a static clone; rebuild it interactive and on-brand.
- Never make the onboarding video without sourcing tokens from `Design.md` when one exists.
- Never deploy or publish the result from this skill; `$ccc-deploy` owns that and asks first.

## See also

- `$ccc-build` — scaffold a new project first
- `$ccc-connect` — connect the figma or shadcn MCP server
- `$ccc-browse` — look at the rendered result in a browser
- `$ccc-makeover` — whole-project health overhaul

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
