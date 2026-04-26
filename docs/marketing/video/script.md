# CC Commander Codex Launch Demo Script

Target runtime: 2:20-2:40 at a calm speaking pace. Spoken script is approximately 410 words.

## Hook (0:00-0:10)

**Kevin says:**

"CC Commander is now the first plugin to ship on both Claude Code AND Codex. Same repo, same 51 skills, same 17 agents. I am going to show you the full install and a real five-agent run in under three minutes."

**Kevin does:**

Show a split screen: Cowork Desktop on the left, Codex on the right. Both are already open to clean sessions. End on the `/ccc` chip picker.

## Demo 1: Install on Claude Code Desktop (0:10-0:35)

**Kevin says:**

"First, in your Cowork Desktop, open Settings → Plugin Marketplace. Click Add from GitHub. Paste KevinZai/commander. Click Add. Now install commander. Reopen the app if it asks. In a clean session, type `/ccc`. That is the Commander chip picker: Build, Review, Ship, Design, Learn, More. You can click instead of memorizing commands."

**Kevin does:**

Open Settings → Plugin Marketplace → Add from GitHub → enter `KevinZai/commander` → Install → open a clean session → type `/ccc` → pause on the chip picker.

## Demo 2: Install on Codex CLI (0:35-1:00)

**Kevin says:**

"Now the same install on Codex CLI. I run: `codex plugin marketplace add KevinZai/commander && codex plugin install commander`. That is it. New Codex session, type `/ccc-build`. Codex loads the same SKILL.md workflow and asks the same first build choice. No second product to learn."

**Kevin does:**

In a dark terminal with 16+ font, run:

```bash
codex plugin marketplace add KevinZai/commander && codex plugin install commander
```

Start or switch to a fresh Codex session. Type `/ccc-build`. Pause on the first workflow choice.

## The Story (1:00-1:30)

**Kevin says:**

"The reason this works is simple, and it happened in December 2025. OpenAI adopted Anthropic's Agent Skills spec. SKILL.md ports 1:1. Commander shipped on both within months because the core workflows were already skills. The Codex work was mostly translation: plugin manifest, agent TOML, and hook event mapping. Three Claude hooks do not exist in Codex yet: Notification, PreCompact, and SubagentStop. Those are documented. The 51 skills and the core PM workflow still run."

**Kevin does:**

Show a simple timeline: Dec 2025 spec convergence → SKILL.md ports 1:1 → Claude Code + Codex. Cut briefly to a `SKILL.md` file beside the Codex adapter folder.

## Demo 3: /ccc-fleet (1:30-2:00)

**Kevin says:**

"Now the part I care about: `/ccc-fleet`. I choose Fan-out, pick five worktrees, and dispatch five focused agents. You can see five independent branches: docs, tests, UI, adapter, release notes. It is not 5 agents pretending to be 1. It is 5 actual sub-agents in 5 git worktrees doing real work. Each agent has its own context, its own diff, and its own result to merge or reject."

**Kevin does:**

Type `/ccc-fleet` → choose Fan-out → show five worktrees in terminal panes or Desktop task views → show each agent producing separate progress/diffs.

## Close (2:00-2:30)

**Kevin says:**

"Install Commander from `github.com/KevinZai/commander`. It is free forever. You get 51 plugin skills, 17 specialist agents, and the 502+ skill ecosystem. The wider hosted MCP path is not live yet; this launch is the native Claude Code and Codex plugin path. The promise is simple: all on every coding agent you already use. Install in 30 seconds. Link in description."

**Kevin does:**

Show the repo URL, the two install commands, and a final split screen with `/ccc` in Cowork Desktop and `/ccc-build` in Codex.
