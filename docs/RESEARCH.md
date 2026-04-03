# Claude Code Bible — Research & Ecosystem Analysis

> Compiled 2026-03-27 during v1.0 planning session. This is the source material behind the plan at `~/.claude/plans/swirling-brewing-pancake.md`.

---

## 1. Ecosystem Repo Analysis

### Official Anthropic Repos
- **anthropics/claude-code** — The CLI itself. Boris Cherny is the creator. Key patterns: `.claude/` directory structure, CLAUDE.md convention, hooks lifecycle (PreToolUse, PostToolUse, Stop), slash commands as `.md` files in `commands/`, settings.json schema.
- **anthropics/claude-code-sdk** — Agent SDK for building custom agents on top of Claude Code. TypeScript/Python.
- **anthropics/courses** — Prompt engineering courses with Claude. Good reference for few-shot patterns.

### High-Star Community Repos (5K+)
- **SuperClaude Framework** (22K stars, MIT, Python) — 30 commands, 20 agents, 6 skills, <5 hooks. Novel innovations: Confidence Checking (0-100%), Four-Question Validation, Wave→Checkpoint→Wave parallel execution, token budgeting, PDCA cycle, Reflexion pattern, behavioral modes.
- **ECC — Everything Claude Code** (100K stars) — Developer profiles, 28 agents, 65+ rules, 68 commands, 248+ skills, full hook lifecycle. Already integrated into Kevin's setup. Kit inherits 19 ECC hooks via `CLAUDE_PLUGIN_ROOT`.
- **anthropics/claude-plugins-official** (15K stars) — Plugin packaging standard with `.claude-plugin/plugin.json` manifest. Marketplace compatibility target.

### Lower-Star But Valuable
- **michielhdoteth/claude-bible** (0 stars, MIT) — Pure documentation repo. `best-practices.md` (38KB) covers ethics, security, QA philosophy. Prompt engineering guide covers few-shot/chain-of-thought fundamentals. Verdict: cross-reference as "Further Reading", extract 2-3 key insights. Don't copy — complementary but thin vs our 1,749-line Bible.
- **4riel/cc-bible** — Community-contributed Claude Code best practices. Source of several practical tips not found elsewhere.

---

## 2. Best Practices Extraction (16 Missing Categories)

Sources: Boris Cherny's tips, David Ondrej's thread, 4riel/cc-bible, michielhdoteth/claude-bible, Trail of Bits config, official Anthropic docs, SuperClaude Framework.

### Category 1: Context Window Management
- **MAX_THINKING_TOKENS=10000** for routine work (saves ~60% thinking budget)
- Compact within 5 min of last message (cache still hot)
- `.claudeignore` cuts context 30-40% — exclude node_modules, .git, build artifacts, large data files
- Context at 70% = precision loss begins. Plan handoff to fresh session.
- **Source:** Boris Cherny, David Ondrej

### Category 2: Cost Optimization
- Haiku for 90% of subagent work (3x savings, 90% of Sonnet capability)
- Token budgeting: set per-task token limits
- Cache-aware compaction timing (compact while cache warm = cheaper re-read)
- Model routing: Haiku (lightweight), Sonnet (coding), Opus (reasoning)
- **Source:** SuperClaude, Boris Cherny

### Category 3: Confidence-Based Execution (NEW — from SuperClaude)
- Before executing any plan, self-assess confidence 0-100%
- >=90%: proceed autonomously
- 70-89%: present alternatives, ask clarifying questions
- <70%: stop, ask questions, gather more context
- **Projected ROI:** 25-250x token savings by preventing wrong-direction work
- **Source:** SuperClaude Framework

### Category 4: Hallucination Detection (NEW — from SuperClaude)
- Four-Question Validation post-implementation:
  1. All tests passing?
  2. All requirements met?
  3. No assumptions without verification?
  4. Evidence for each claim?
- **94% hallucination detection rate** in SuperClaude benchmarks
- **Source:** SuperClaude Framework

### Category 5: Parallel Execution Framework (NEW — from SuperClaude)
- Wave→Checkpoint→Wave pattern for independent tasks
- Wave 1: Launch all independent agents simultaneously
- Checkpoint: Collect results, validate, decide next wave
- Wave 2: Launch dependent tasks based on Wave 1 results
- **3.5x measured speedup** over sequential execution
- **Source:** SuperClaude Framework

### Category 6: CLAUDE.md Structuring
- Static content first, dynamic last (optimizes caching)
- Use sections: project context > coding standards > architecture > workflows > constraints
- Keep under 500 lines — longer = diminished returns
- Project-level overrides global. Both are loaded.
- **Source:** Boris Cherny, Trail of Bits

### Category 7: Hook Safety Patterns
- careful-guard is a **best-effort safety net, NOT a security boundary**
- Regex-based blocking is bypassable (base64, variable expansion, aliases)
- Defense in depth: hooks + .claude/settings.json deny list + OS-level protections
- Never rely solely on PreToolUse hooks for security
- **Source:** Trail of Bits, security analysis

### Category 8: Git Workflow Best Practices
- Never `--no-verify` (bypasses hooks = bypasses safety)
- Never `push --force` to main/master
- Commit frequently with conventional commits
- Branch naming: `type/description` or `cc-{number}-{slug}`
- **Source:** Boris Cherny, ECC

### Category 9: Error Recovery Patterns
- After fixing a bug: write class-level tests, sweep for siblings, update CLAUDE.md
- "Operationalize every fix" — every bug is a learning opportunity
- Corrective framing over reminders
- **Source:** David Ondrej, Kevin's workflow

### Category 10: Multi-Agent Orchestration
- One task per subagent, parallel when independent
- Never switch models mid-session (use subagents for different model needs)
- Structured dispatch with report formats
- Split role sub-agents for diverse perspectives (Factual + Senior + Security + Consistency)
- **Source:** SuperClaude, ECC

### Category 11: Testing Strategy
- Evals before specs (define "done" and "broken" before writing code)
- TDD mandatory: RED → GREEN → REFACTOR
- 80%+ coverage minimum
- Unit + Integration + E2E (all three required)
- **Source:** Boris Cherny, David Ondrej

### Category 12: Security Hardening
- Never hardcode secrets (use env vars or secret manager)
- Validate all user input at system boundaries
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized HTML)
- CSRF protection
- Rate limiting on all endpoints
- Error messages don't leak sensitive data
- **Source:** Trail of Bits, OWASP

### Category 13: Performance Patterns
- Avoid last 20% of context window for complex tasks
- Extended thinking enabled by default (up to 31,999 tokens)
- Plan mode for 3+ step tasks
- Multiple critique rounds for thorough analysis
- **Source:** Boris Cherny, Anthropic docs

### Category 14: IDE Integration
- Claude Code extension is NOT extensible from third-party VS Code extensions
- Best approach: `.vscode/tasks.json` + keybindings
- URI handler: `vscode://anthropic.claude-code/open?prompt=...`
- Keyboard chords: Ctrl+Shift+K prefix for task shortcuts
- **Source:** VS Code extension analysis

### Category 15: Plugin Packaging
- `.claude-plugin/plugin.json` manifest for marketplace
- Standard fields: name, version, description, author, repository
- Entry points: commands, skills, hooks, agents
- **Source:** anthropics/claude-plugins-official

### Category 16: Session Persistence
- Auto-save sessions to `~/.claude/sessions/`
- Learned skills persist in `~/.claude/learned-skills/`
- `/save-session` before closing, `/resume-session` on startup
- Memory hierarchy: CLAUDE.md (always loaded) > sessions (on-demand) > learned-skills (auto-applied)
- **Source:** ECC, David Ondrej

---

## 3. OpenClaw Integration Map (Kevin's Overlay)

### Ports & Services
| Service | Port | Purpose |
|---------|------|---------|
| OpenClaw Gateway | 18789 | Core orchestrator (WebSocket + HTTP) |
| Paperclip | 3110 | Task/issue management |
| Ollama | 11434 | Local LLM inference |
| n8n | 5678 | Workflow automation |
| AO Dashboard | 3005 | Agent orchestrator UI |

### Session Keys
- Agent session key: `agent:claude-dev:discord:channel:1477872497599840369`
- Comms-log channel: `1480676421457416306`

### Hook Integration Points
- **Pre-Tool hook:** Validate against Paperclip status before major git operations
- **Post-Tool hook:** Auto-update Paperclip issue status on successful code changes
- **Stop hook:** Notify Kevin via Telegram (ID: 6418588155) on key milestones
- **Inter-agent protocol:** All `sessions_send()` calls logged to `#comms-log`
- **Mission Control:** Ensure hook stays enabled for real-time visibility

### MCP Server Configs (Kevin's)
- `github` (KevinZai account)
- `github-gn` (mywifinetworks account)
- Third public-facing account TBD
- `linear` (personal/CC- tasks)
- `linear-gn` (GN staff workspace)
- `paperclip` (localhost:3110)
- `vibe-annotations` (visual UI feedback)
- `shadcn-ui` (component source)

### Laptop vs Workstation Detection
- MacBookPro hostname → isolated mode, different Ollama port
- Mac-Mini hostname → full stack, Tailscale IP, all services available

---

## 4. Trademark Research

### "CLAUDE" Word Mark
- **USPTO Serial 97790228** — Anthropic owns "CLAUDE" for AI assistant services
- Phonetic equivalents doctrine (Coca-Cola v. Koka-Kola, 1945) makes K-spelling legally meaningless
- "Klaude Kode" would likely violate Anthropic's mark
- Using "Claude Code" descriptively (as in "a tool for Claude Code") is safe — dozens of community projects do this

### Safe Naming Patterns
- "The Claude Code Bible" — uses "Claude Code" descriptively, "Bible" is generic/common
- "Kevin Z's Claude Code Bible" — personal attribution + descriptive use
- Community precedent: "Awesome Claude Code", "Everything Claude Code", "Claude Code Tips" all use descriptive pattern safely

### Who Coined "Bible"
- **Boris Cherny** created Claude Code itself (NOT Alex Albert)
- Boris never used the term "bible" for Claude Code
- **David Ondrej** was one of the first to use "bible" in context of comprehensive Claude Code guides
- The term is generic/descriptive — no one owns it

---

## 5. SuperClaude Framework Deep Dive

### Architecture
- Python-based framework with 30 commands, 20 agents, 6 skills
- Key innovation: behavioral modes that adapt Claude's approach based on task type
- Token budgeting system assigns per-task token limits

### Three Concepts We're Integrating

**1. Confidence Checking (HIGHEST VALUE)**
```
Before any plan execution:
  confidence = self_assess(0-100)
  if confidence >= 90: proceed()
  elif confidence >= 70: present_alternatives(); ask_questions()
  else: stop(); gather_more_context()
```
ROI: 25-250x token savings by preventing wrong-direction work.

**2. Four-Question Validation (HIGH VALUE)**
Post-implementation check:
1. All tests passing?
2. All requirements met?
3. No assumptions without verification?
4. Evidence for each claim?
94% hallucination detection rate.

**3. Parallel Execution Framework (MEDIUM VALUE)**
Wave→Checkpoint→Wave pattern:
- Wave 1: Launch independent agents
- Checkpoint: Validate, collect results
- Wave 2: Launch dependent tasks
3.5x measured speedup.

### Concepts We're Cross-Referencing Only
- Token budgeting system (nice-to-have, not core)
- PDCA cycle (our tasks/lessons.md already serves this)
- Reflexion pattern (our KNOWLEDGE.md covers this)
- Behavioral modes (our CCC domains are more granular)

---

## 6. michielhdoteth/claude-bible Analysis

- **0 stars, MIT license** — very low traction
- Pure documentation repo — theory and guidance, no executable components
- `best-practices.md` (38KB) covers ethics, security, QA philosophy we don't have
- Prompt engineering guide: few-shot, chain-of-thought fundamentals
- **Verdict:** Cross-reference in BIBLE.md Appendix as "Further Reading" with link
- Extract 2-3 key insights into our best practices sections
- Don't copy content — complementary but thin compared to our kit

---

## 7. Branding Options & Status

### Decision: Pending User Confirmation
Kevin is torn between uniqueness and descriptiveness.

**Options discussed:**
| Option | Pros | Cons |
|--------|------|------|
| "The Claude Code Bible" | Descriptive, SEO-friendly, legally safe | Generic, not unique |
| "Kevin Z's Claude Code Bible" | Personal brand, attribution | Still uses "Bible" which Kevin worried about originality |
| "The Claude Code Bible — by Kevin Z" | Best of both — brand + attribution | Slightly long |

**Kevin's concerns:**
- Wants it to be unique, not generic
- Worried "Bible" is overused (it's not — only 2 repos use it, both tiny)
- Wants personal touch but also broad appeal

**Recommendation:** "The Claude Code Bible — by Kevin Z" is the strongest option. It's descriptive (SEO), personal (attribution), legally safe (descriptive use of "Claude Code"), and the "Bible" term is NOT overused in this space.

---

## 8. Security Fixes Already Applied (commit 4cfc1f8)

1. **install.sh password** — Changed from plaintext comparison to SHA-256 hash. NOTE: Still security theater since hash of "kz123" is in public repo. Plan replaces with env var check.
2. **install.sh sed injection** — User name input now sanitized for sed metacharacters.
3. **careful-guard.js** — Improved regex to catch more `rm` variants, force push patterns, unqualified DELETE FROM.
4. **settings.json.template** — Added deny list for destructive commands, scoped WebFetch to 3 domains.

---

## 9. Key Decisions (Confirmed)

| Decision | Choice | Status |
|----------|--------|--------|
| Name | "The Claude Code Bible" — by Kevin Z | Confirmed |
| Repo rename | claude-code-kit → claude-code-bible → cc-commander | Confirmed |
| Slash command | `/cc` (no conflicts verified) | Confirmed |
| Kevin overlay | Same repo, `kevin/` directory, clearly marked | Confirmed |
| SuperClaude integration | All 3 concepts (confidence + 4Q + parallel) | Confirmed |
| Version | Consolidate to v1.0 | Confirmed |
| Kevin personal data | NO personal data in kevin/ — just workflow configs | Confirmed |
