# Quickstart Guide: Complete Beginner

> Never used Claude Code before? Start here. From zero to your first project in 15 minutes.

---

## What is Claude Code?

Claude Code is an AI coding assistant that runs in your terminal (or VS Code). You type natural language instructions, and it writes code, runs commands, edits files, and debugs issues — all within your actual codebase.

Think of it as a senior developer pair programming with you, except it never gets tired and has read every framework's documentation.

## What is CC Commander?

CC Commander is a configuration toolkit that makes Claude Code dramatically more effective. It adds:

- **280+ skills** — specialized knowledge modules (like plugins)
- **88+ commands** — slash commands for common workflows (`/plan`, `/verify`, `/tdd`)
- **9 workflow modes** — switch Claude's behavior to match your task (design, SaaS, marketing, etc.)
- **36+ prompt templates** — battle-tested starting points for common tasks
- **37 hooks** — automatic behaviors (checkpoints, cost alerts, context monitoring)

Without CC Commander, Claude Code is a general-purpose assistant. With CC Commander, it becomes a structured development environment with best practices baked in.

---

## Installation

### Prerequisites

- **Node.js 18+** — check with `node --version`
- **Claude Code** — install from [anthropic.com/claude/code](https://claude.ai/code) or `npm install -g @anthropic-ai/claude-code`
- **Git** — check with `git --version`

### Install CC Commander (One Command)

Open your terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
```

The installer:
1. Detects your existing Claude Code configuration
2. Backs up your current files (safe to re-run)
3. Installs skills, commands, hooks, and templates
4. Shows a verification summary

**Alternative: Clone and install manually**

```bash
git clone https://github.com/KevinZai/cc-commander.git
cd cc-commander
./install.sh
```

Use `./install.sh --dry-run` to preview changes without writing anything.

---

## Your First 5 Minutes

### Minute 1: Open Claude Code

```bash
# In any directory
claude
```

This opens an interactive Claude Code session in your terminal.

### Minute 2: Explore the Command Center

```
/cc
```

This shows you every available command, organized by category. Browse the list to see what is available.

### Minute 3: Check Your Installation

```
/harness-audit
```

This verifies that CC Commander is installed correctly — skills loaded, hooks active, commands available.

### Minute 4: Try a Simple Task

```
Create a simple Node.js script that fetches the current weather
for a city passed as a command-line argument. Use the wttr.in API.
```

Watch Claude write the code, create the file, and offer to run it.

### Minute 5: Verify the Result

```
/verify
```

Claude checks that the code works, handles errors, and has no issues.

---

## Your First Project

Let's build a real project from scratch, step by step.

### Step 1: Create a Project Directory

```bash
mkdir my-first-project
cd my-first-project
git init
claude
```

### Step 2: Initialize with CC Commander

```
/init
```

CC Commander's decision tree wizard asks you:
- What are you building? (landing page, API, SaaS, CLI, etc.)
- What is your tech stack? (auto-detected if package.json exists)
- How complex is this? (quick build, deep build, full SaaS)

Based on your answers, it creates a tailored `CLAUDE.md` file for your project.

**For your first project, try:** "I'm building a simple REST API with Node.js"

### Step 3: Plan the Feature

```
/plan
Build a REST API with Express that has:
- GET /health — returns { status: "ok" }
- GET /todos — returns a list of todos
- POST /todos — creates a new todo
- DELETE /todos/:id — deletes a todo
Use in-memory storage (no database).
```

Claude creates a numbered implementation plan with files to create and steps to follow.

### Step 4: Build It

```
Execute the plan. Start with step 1.
```

Claude creates files, writes code, and explains each step as it goes.

### Step 5: Test It

```
/tdd
Write tests for the /todos API endpoints using Vitest and supertest.
```

Claude writes tests first, then verifies the implementation passes them.

### Step 6: Verify Everything

```
/verify
```

Full verification: tests pass, no errors, API responds correctly.

### Step 7: Commit Your Work

```
/checkpoint
```

Creates a git commit with a conventional commit message.

Congratulations — you just built, tested, and shipped a project using the CC Commander workflow.

---

## Common Questions

**Q: Do I need to pay for Claude Code?**
A: Yes, Claude Code requires an Anthropic API key or a Claude Pro/Max subscription. CC Commander itself is free and open source.

**Q: Will CC Commander overwrite my existing Claude Code settings?**
A: No. The installer backs up your existing files before making changes. You can restore from backup at any time with the uninstaller.

**Q: Which model should I use?**
A: Start with **Sonnet** (the default). It handles 90% of tasks well. Switch to **Opus** for complex architecture decisions. Use **Haiku** for simple, repetitive tasks to save cost.

**Q: How do I update CC Commander?**
A: Re-run the installer. It detects the existing installation and updates only changed files.

**Q: Can I use this with VS Code?**
A: Yes. Install the Claude Code VS Code extension (`anthropic.claude-code`). CC Commander works in both terminal and VS Code. See the `vscode-bible` skill for VS Code-specific configuration.

**Q: What if a command does not work?**
A: Run `/harness-audit` to check your installation. If a specific command fails, check that the corresponding `.md` file exists in `~/.claude/commands/`.

**Q: How do I uninstall?**
A: Run the uninstaller from the cloned repo:
```bash
./uninstall.sh
```
It removes Bible components and restores your backup.

---

## Where to Get Help

| Resource | URL / Path |
|----------|-----------|
| GitHub Issues | [github.com/KevinZai/cc-commander/issues](https://github.com/KevinZai/cc-commander/issues) |
| Bible Guide Skill | Type "use bible-guide skill" in Claude Code |
| Cheatsheet | `~/.claude/CHEATSHEET.md` or type `/cc` |
| Full Documentation | `~/.claude/BIBLE.md` |
| VS Code Guide | "use vscode-bible skill" in Claude Code |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Giving Vague Instructions

```
# Bad — vague, no constraints
Build me a website

# Good — specific, scoped, constrained
Build a single-page marketing site for a dog walking service.
Sections: hero, features (3 cards), pricing (2 tiers), footer.
Use Next.js 15, Tailwind v4, shadcn/ui. Mobile-first. Dark mode.
```

The more specific your instructions, the better the output. Include: what you want, the tech stack, layout requirements, constraints, and the target audience.

### Mistake 2: Not Using /plan for Complex Work

Jumping straight into implementation for anything with 3+ steps leads to inconsistent code. Always `/plan` first — it creates a structured roadmap that Claude follows step by step.

### Mistake 3: Ignoring /verify

Skipping verification means you miss errors. `/verify` catches things humans overlook: TypeScript errors, missing error handling, console warnings, accessibility issues. Run it before every commit.

### Mistake 4: Never Checkpointing

Claude Code works in your real filesystem. If something goes wrong, you need a way to roll back. Use `/checkpoint` frequently — at minimum after each completed feature.

### Mistake 5: Overloading Context

Pasting your entire codebase into the chat window overwhelms context. Let Claude read files as needed. If the conversation gets long, start a new session — CC Commander's session persistence saves your progress.

### Mistake 6: Not Choosing a Mode

The default `normal` mode is fine for general work, but specialized modes (design, saas, marketing) dramatically improve output quality for domain-specific tasks.

### Mistake 7: Fighting the Tool

Claude Code is opinionated about best practices. If it suggests tests, types, or error handling that you did not ask for, that is CC Commander's verification standards working as designed. Lean into it rather than fighting it.

---

## Key Concepts and Commands

### Essential Commands (Learn These First)

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/cc` | Command center | Browse all features |
| `/init` | Project wizard | Starting a new project |
| `/plan` | Implementation plan | Before building anything complex |
| `/verify` | Verification loop | Before committing code |
| `/tdd` | Test-driven dev | When writing new features |
| `/checkpoint` | Git commit | After completing a feature |
| `/code-review` | Code review | After writing code |
| `/harness-audit` | Health check | Troubleshooting issues |

### Intermediate Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/cc mode <name>` | Switch mode | Changing task domain |
| `/cc prompts` | Prompt library | Need a starting template |
| `/cc grill` | Planning probe | Before a big feature |
| `/cc confidence` | Confidence check | Unsure about an approach |
| `/orchestrate` | Multi-agent | Large features needing parallel work |
| `/save-session` | Save context | Before closing a session |
| `/resume-session` | Restore context | Continuing previous work |

### Advanced Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/cc mode night` | Night mode | Autonomous overnight jobs |
| `/cc mode yolo` | YOLO mode | Fast prototyping |
| `/skill-create` | Create skill | Building reusable workflows |
| `/devfleet` | Agent fleet | Complex multi-agent tasks |
| `/eval` | Evaluation | Testing AI output quality |

---

## What to Try Next

Now that you have the basics, here is your progression path:

### Week 1: Master the Essentials
- Use `/init`, `/plan`, `/verify` on every project
- Try `/tdd` for test-driven development
- Use `/checkpoint` for git commits

### Week 2: Explore Modes and Mega-Skills
- Try `/cc mode design` for a frontend project
- Load `mega-saas` for a backend project
- Browse prompts with `/cc prompts`

### Week 3: Power User Features
- Set up a large feature with `/orchestrate`
- Try `/cc mode night` for overnight batch work
- Use `/devfleet` for multi-agent workflows
- Create your own skill with `/skill-create`

### Specialized Guides

Pick the guide that matches your focus area:

- **Frontend developers** — read [quickstart-frontend.md](quickstart-frontend.md)
- **Backend developers** — read [quickstart-backend.md](quickstart-backend.md)
- **Full-stack developers** — read [quickstart-fullstack.md](quickstart-fullstack.md)
- **Mobile developers** — read [quickstart-mobile.md](quickstart-mobile.md)

---

## Glossary

New to AI-assisted development? Here are the key terms you will encounter:

### Claude Code Terms

| Term | Definition |
|------|-----------|
| **Claude Code** | Anthropic's AI coding assistant that runs in your terminal or VS Code. It reads, writes, and edits files in your real codebase. |
| **Session** | A single conversation with Claude Code. Context accumulates within a session. Starting a new session resets context. |
| **Context Window** | The total amount of text Claude can "see" at once (currently ~200K tokens). When it fills up, older context gets dropped. |
| **Token** | A unit of text (roughly 3/4 of a word). Used to measure context size and API cost. |
| **Model** | The AI brain powering Claude Code. Options: Sonnet (fast, capable), Opus (deep reasoning), Haiku (cheap, simple tasks). |
| **Extended Thinking** | A mode where Claude uses extra internal reasoning tokens before responding. Improves quality on complex tasks. |

### Bible Terms

| Term | Definition |
|------|-----------|
| **Skill** | A markdown file that teaches Claude Code specialized knowledge. Skills load on-demand and provide domain expertise (e.g., `api-design`, `landing-page-builder`). |
| **Mega-Skill** | A bundle of related skills behind a single router. Loading one mega-skill gives access to all its sub-skills (e.g., `mega-design` = 35+ design skills). |
| **Command** | A slash command (e.g., `/plan`, `/verify`) that triggers a specific workflow. Commands are `.md` files in `~/.claude/commands/`. |
| **Hook** | An automatic behavior that runs before or after Claude Code actions. Examples: auto-checkpoint on file save, cost alert when spending exceeds budget. |
| **Mode** | A workflow persona that changes Claude's behavior. Modes adjust verbosity, risk tolerance, auto-loaded skills, and review rigor. 9 modes available. |
| **Prompt Template** | A pre-written starting prompt for common tasks. Browse with `/cc prompts`. |
| **CLAUDE.md** | The project-level instruction file that Claude Code reads at session start. CC Commander generates this via `/init`. |

### Infrastructure Terms

| Term | Definition |
|------|-----------|
| **MCP (Model Context Protocol)** | A standard for connecting Claude Code to external tools and data sources. MCP servers provide capabilities like GitHub access, database queries, or browser automation. |
| **MCP Server** | A service that implements MCP to give Claude Code a specific capability. Example: `github` MCP lets Claude read/write GitHub repos. |
| **Subagent** | A separate Claude Code instance spawned to handle a specific subtask. Subagents run in parallel and report back. Used for large features. |
| **Context Compaction** | When the context window fills up, Claude Code automatically summarizes older content to make room. CC Commander's pre-compact hook saves state before this happens. |
| **Conventional Commits** | A commit message format: `type: description` (e.g., `feat: add login page`, `fix: resolve null pointer`). CC Commander enforces this standard. |
| **TDD (Test-Driven Development)** | Writing tests before implementation. CC Commander's `/tdd` command follows the red-green-refactor cycle. |
| **DAG (Directed Acyclic Graph)** | A workflow where tasks have dependencies but no circular references. Used by task-commander to parallelize work. |
| **E2E (End-to-End) Testing** | Testing the full user flow from start to finish, typically with a browser automation tool like Playwright. |
