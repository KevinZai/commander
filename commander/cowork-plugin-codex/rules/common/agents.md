# Agent Selection

Which CC Commander agent to reach for. How to brief, isolate, and verify a delegated agent is defined once in `rules/fable-method.md` (Pillars 2, 5, 8); when to delegate at all is in `rules/workflow-first.md`.

## Plugin agents

The plugin ships its agents in `commander/cowork-plugin/agents/`. Read that directory for the current set; each agent's frontmatter names its model tier and tools.

| Need | Agent |
|---|---|
| System design, trade-offs, technology selection | `architect` |
| Feature implementation against a plan | `builder` |
| Root-cause debugging | `debugger` |
| Code review (general) | `reviewer`; language-specific `*-reviewer` agents for TypeScript, Python, Go, Rust, Java, Kotlin, C# |
| Security audit, threat model | `security-auditor` |
| Test suites, coverage, edge cases | `qa-engineer` |
| CI/CD, infrastructure, deploys | `devops-engineer` |
| Hot paths and profiling (read-only) | `performance-engineer` |
| UI/UX design and frontend polish | `designer` |
| Research and competitive analysis | `researcher` |
| Data exploration and analysis | `data-analyst` |
| Specs, PRDs, user stories | `product-manager` |
| Documentation | `technical-writer` |
| Marketing and content | `content-strategist` |
| One scoped item in a parallel batch | `fleet-worker` |

## Choosing well

- Prefer the narrowest agent that owns the task. A language reviewer beats the general reviewer when the diff is one language.
- Read-only agents (`performance-engineer`, `researcher`, `data-analyst`) are safe to run in parallel with a writer; writers need non-overlapping file domains.
- Use a verifier that did not do the work: `reviewer` or `security-auditor` checks `builder` output, never `builder` itself.
- For an important or expensive-to-reverse decision, run a dialectic: one agent argues for, one against, and a referee (often the orchestrator) decides with a 🟢 call.
- Agent availability is session-specific. Confirm the agent is exposed before relying on it; fall back to inline work or `codex exec --json` when it is not.
