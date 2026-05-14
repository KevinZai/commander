export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  effort: string;
}

export const agents: Agent[] = [
  {
    id: 'architect',
    name: 'Architect',
    description: 'Senior software architect for deep system design, architectural trade-offs, and technology selection',
    model: 'claude-opus-4-7',
    effort: 'xhigh'
  },
  {
    id: 'builder',
    name: 'Builder',
    description: 'Implements features, fixes bugs, and creates projects from specs. Follows TDD workflow',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'content-strategist',
    name: 'Content Strategist',
    description: 'Senior content strategist and writer for content strategy plans, editorial calendars, and copy',
    model: 'claude-sonnet-4-6',
    effort: 'medium'
  },
  {
    id: 'csharp-reviewer',
    name: 'C# Reviewer',
    description: 'C#-specific code reviewer. Audits for .NET patterns, async/await correctness, LINQ usage',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Senior data analyst for data exploration, statistical analysis, pipelines, and visualizations',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'debugger',
    name: 'Debugger',
    description: 'Systematic debugger using the Iron Law: no fix without confirmed root cause',
    model: 'claude-opus-4-7',
    effort: 'high'
  },
  {
    id: 'designer',
    name: 'Designer',
    description: 'Senior UI/UX designer and frontend implementer using anti-slop methodology and accessibility',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    description: 'Senior DevOps and platform engineer for CI/CD pipelines, infrastructure, and monitoring',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'fleet-worker',
    name: 'Fleet Worker',
    description: 'General-purpose parallel worker for fleet operations. Executes a single scoped task independently',
    model: 'claude-sonnet-4-6',
    effort: 'medium'
  },
  {
    id: 'go-reviewer',
    name: 'Go Reviewer',
    description: 'Go-specific code reviewer. Audits for Effective Go idioms, gofmt compliance, error handling',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'java-reviewer',
    name: 'Java Reviewer',
    description: 'Java-specific code reviewer. Audits for PMD/Spotless compliance, Spring patterns',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'kotlin-reviewer',
    name: 'Kotlin Reviewer',
    description: 'Kotlin-specific code reviewer. Audits for idiomatic Kotlin, coroutine patterns',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'performance-engineer',
    name: 'Performance Engineer',
    description: 'Performance specialist for identifying bottlenecks, profiling hot paths, and optimization',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    description: 'Senior product manager for feature scoping, PRD writing, user story creation, and prioritization',
    model: 'claude-opus-4-7',
    effort: 'xhigh'
  },
  {
    id: 'python-reviewer',
    name: 'Python Reviewer',
    description: 'Python-specific code reviewer. Audits for PEP 8 compliance, type hints, async patterns',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'qa-engineer',
    name: 'QA Engineer',
    description: 'Senior QA engineer for test suite creation, coverage analysis, and quality gates',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Deep research agent for competitive analysis, market research, code audits, and findings synthesis',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Reviews code changes for security vulnerabilities, performance issues, and correctness',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'rust-reviewer',
    name: 'Rust Reviewer',
    description: 'Rust-specific code reviewer. Audits for ownership/lifetime correctness, idioms',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  },
  {
    id: 'security-auditor',
    name: 'Security Auditor',
    description: 'Senior application security engineer for OWASP-mapped audits, vulnerability assessment',
    model: 'claude-opus-4-7',
    effort: 'high'
  },
  {
    id: 'technical-writer',
    name: 'Technical Writer',
    description: 'Senior technical writer for API docs, READMEs, user guides, and developer education',
    model: 'claude-sonnet-4-6',
    effort: 'medium'
  },
  {
    id: 'typescript-reviewer',
    name: 'TypeScript Reviewer',
    description: 'TypeScript-specific code reviewer. Audits for type safety, async correctness, patterns',
    model: 'claude-sonnet-4-6',
    effort: 'high'
  }
];
