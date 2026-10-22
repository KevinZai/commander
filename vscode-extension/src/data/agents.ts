// Generated from commander/cowork-plugin/agents/*.md frontmatter (v8 routing).
// Regenerate after editing an agent: see docs/PROMPT-STANDARD.md §2.
export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  effort: string;
}

export const agents: Agent[] = [
  {
    id: "architect",
    name: "Architect",
    description: "System design, trade-offs, migrations and technology choices grounded in the codebase",
    model: "claude-fable-5-1",
    effort: "xhigh"
  },
  {
    id: "builder",
    name: "Builder",
    description: "Implements a scoped feature or fix test-first with the smallest passing change, verified by the project's checks",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "content-strategist",
    name: "Content Strategist",
    description: "Content strategy and draft copy for a named reader: plans, posts, landing pages, emails, social. Drafts only. Use to pla",
    model: "claude-sonnet-5-5",
    effort: "medium"
  },
  {
    id: "csharp-reviewer",
    name: "C# Reviewer",
    description: "Read-only C#/.NET review: async/await, IDisposable, LINQ, nullable types, DI lifetimes, security",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Read-only data analysis with sample sizes, confidence, chart specs and reproducible queries",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "debugger",
    name: "Debugger",
    description: "Root-cause debugging: reproduce, confirm the cause with evidence, apply a minimal fix and prove it with a regression tes",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "designer",
    name: "Designer",
    description: "UI/UX design and frontend implementation on the existing design system, WCAG AA, checked across widths. Use to build, po",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "devops-engineer",
    name: "Devops Engineer",
    description: "CI/CD, containers, IaC, deploys and monitoring, each with a preview and rollback plan. Use to set up or fix CI, write Do",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "fleet-worker",
    name: "Fleet Worker",
    description: "Parallel worker for one scoped fleet task: stays in its files, runs the named checks, returns a structured report",
    model: "claude-sonnet-5-5",
    effort: "medium"
  },
  {
    id: "go-reviewer",
    name: "Go Reviewer",
    description: "Read-only Go review: goroutine and channel safety, errors, context propagation, idioms, security",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "java-reviewer",
    name: "Java Reviewer",
    description: "Read-only Java review: null safety, resources, Spring pitfalls, concurrency, security",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "kotlin-reviewer",
    name: "Kotlin Reviewer",
    description: "Read-only Kotlin review: null safety, coroutines, idioms, Android lifecycle and security",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "performance-engineer",
    name: "Performance Engineer",
    description: "Read-only performance audit: hot paths, measured or estimated cost, and fixes ranked by impact and effort",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "product-manager",
    name: "Product Manager",
    description: "Feature scoping, PRDs, user stories with testable acceptance criteria, metrics and prioritization. Use to turn an idea i",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "python-reviewer",
    name: "Python Reviewer",
    description: "Read-only Python review: type hints, async, idioms, pytest quality and security. Returns path:line findings",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "qa-engineer",
    name: "Qa Engineer",
    description: "Adversarial QA in an isolated worktree: breaking-case tests, coverage delta and reproducible bug reports. Use to test a ",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "researcher",
    name: "Researcher",
    description: "Sourced research with dated citations and observed/inferred/speculative labels, ending in recommendations",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Read-only review of a diff or PR for correctness, security, performance and maintainability. Returns path:line findings ",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "rust-reviewer",
    name: "Rust Reviewer",
    description: "Read-only Rust review: ownership, unsafe soundness, async/Tokio, error handling, clippy idioms, security",
    model: "claude-opus-5-5",
    effort: "high"
  },
  {
    id: "security-auditor",
    name: "Security Auditor",
    description: "Read-only security audit: OWASP/CWE-mapped findings with exploit path, fix and verification",
    model: "claude-fable-5-1",
    effort: "xhigh"
  },
  {
    id: "technical-writer",
    name: "Technical Writer",
    description: "Developer docs written from the code: READMEs, API references, guides, architecture overviews, changelogs",
    model: "claude-sonnet-5-5",
    effort: "medium"
  },
  {
    id: "typescript-reviewer",
    name: "TypeScript Reviewer",
    description: "Read-only TypeScript/JavaScript review: type safety, async, ESM/CJS, runtime boundaries, security",
    model: "claude-opus-5-5",
    effort: "high"
  }
];
