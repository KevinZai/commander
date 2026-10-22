# Agent matrix for start-plan recommendations

Used by `/ccc-start` step 6. The live roster is the set of files in `${CLAUDE_PLUGIN_ROOT}/agents/`; read an agent's frontmatter when the one-liner below is not enough, and skip any row whose file is missing.

| Agent | Best for |
|---|---|
| architect | System design, tech selection, refactoring strategy |
| builder | Test-driven implementation, feature work, bug fixes |
| debugger | Root-cause investigation |
| reviewer | PR review with severity-rated findings |
| qa-engineer | Test suites, coverage, edge cases |
| security-auditor | OWASP audits, CVE mapping, remediation |
| performance-engineer | Hot-path profiling, N+1 queries, bundle size |
| designer | UI/UX and frontend implementation |
| devops-engineer | CI/CD, deploys, infrastructure, monitoring |
| product-manager | PRDs, user stories, tracker issues |
| technical-writer | Docs, READMEs, API reference |
| researcher | Competitive, market and literature research |
| data-analyst | Cohort analysis, insights, visualization specs |
| content-strategist | Editorial calendars, content pillars |
| fleet-worker | Parallel batch work (migrations, sweeps) |
| typescript-reviewer | TypeScript review, type safety |
| python-reviewer | Python review, idioms, packaging |
| go-reviewer | Go review, concurrency, error handling |
| rust-reviewer | Rust review, ownership, unsafe audit |
| java-reviewer | Java review, JVM patterns, Spring |
| kotlin-reviewer | Kotlin review, coroutines, Android |
| csharp-reviewer | C# review, .NET patterns, async |

## Picking three

Choose from the detected stack and the user's answers, one line of why each:

- Next.js or React web app → designer, builder, qa-engineer
- Node or Python API → builder, security-auditor, qa-engineer (swap in python-reviewer or typescript-reviewer for the stack)
- CLI → builder, qa-engineer, technical-writer
- Mobile → designer, builder, kotlin-reviewer or qa-engineer
- Existing repo with no tests → qa-engineer, reviewer, builder
- Enterprise audience → add security-auditor in place of the weakest fit
