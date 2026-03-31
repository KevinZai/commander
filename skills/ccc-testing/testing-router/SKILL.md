---
name: Testing Router
description: "Routes your testing task to the right specialist skill within KZ Mega-Testing."
version: 1.0.0
category: testing
parent: ccc-testing
---

# Testing Router

> Don't know which testing skill to use? Start here. Describe what you need and get routed to the right specialist.

## How It Works

1. Describe your testing need in plain language
2. The router matches your intent to the best specialist skill
3. Follow the specialist's workflow

## Quick Decision Tree

```
What are you trying to do?
│
├── Writing NEW code?
│   ├── Want tests first? → tdd-workflow
│   ├── Want quality checks as you write? → plankton-code-quality
│   └── Building evals for AI behavior? → eval-harness
│
├── Testing EXISTING code?
│   ├── Unit/integration tests needed? → tdd-workflow
│   ├── End-to-end browser tests? → e2e-testing / webapp-testing
│   ├── Visual appearance tests? → visual-regression
│   ├── Performance/load tests? → load-testing
│   └── Python project? → python-testing
│
├── Finding BUGS?
│   ├── Find and fix bugs? → qa
│   ├── Find and report only? → qa-only
│   └── Check if recent changes broke things? → ai-regression-testing
│
├── VERIFYING work?
│   ├── Multi-step verification checklist? → verification-loop
│   └── Prove changes work before shipping? → verification-before-completion
│
└── PLANNING tests?
    └── What should I test and how? → test-strategy
```

## Skill Capabilities Summary

### tdd-workflow
- Red/green/refactor cycle
- Coverage tracking and enforcement (80% minimum)
- Works with Vitest, Jest, pytest, Go testing
- Best for: new features, bug reproduction

### e2e-testing
- Playwright test generation
- Page Object Model patterns
- CI/CD integration (GitHub Actions)
- Best for: critical user journeys, cross-browser testing

### webapp-testing
- Playwright with local dev server integration
- Auto-starts dev server, waits for ready
- Visual snapshot testing built in
- Best for: testing local web apps during development

### visual-regression
- Screenshot comparison with configurable thresholds
- Percy and Chromatic integration
- Dynamic content handling (masking, freezing)
- Best for: UI consistency, design system validation

### load-testing
- k6 and Artillery script generation
- Scenario types: ramp-up, sustained, spike, stress
- Threshold-based pass/fail (p95, error rate)
- Best for: API performance, capacity planning

### qa / qa-only
- Systematic bug hunting across the codebase
- qa: finds AND fixes bugs, commits the fixes
- qa-only: finds and reports bugs in a structured report
- Best for: pre-release quality gates

### ai-regression-testing
- AI-powered analysis of test result diffs
- Detects behavioral regressions beyond simple pass/fail
- Compares test output semantics across runs
- Best for: catching subtle regressions after refactors

### verification-loop
- Multi-step verification checklist
- TypeScript compilation, lint, test suite, E2E
- Console error checking, manual verification prompts
- Best for: final sign-off before marking work complete

### verification-before-completion
- Evidence-based proof that changes work
- Screenshots, test output, build logs as artifacts
- Structured proof document
- Best for: async review, proving to stakeholders

### eval-harness
- Build evaluation criteria before implementation
- Define pass/fail for AI behaviors
- Structured eval suites with scoring
- Best for: AI/ML feature development, prompt engineering

### plankton-code-quality
- Real-time quality checks during code authoring
- Catches common issues: mutation, deep nesting, missing error handling
- Language-aware patterns
- Best for: maintaining quality standards as you write

### python-testing
- pytest patterns: fixtures, parametrize, mocking
- conftest.py organization
- Coverage with pytest-cov
- Best for: Python projects needing comprehensive test suites

### test-strategy
- Analyzes project structure and recommends test approach
- Coverage targets by module criticality
- Framework recommendations based on stack
- Best for: greenfield projects, testing overhauls

## Combining Skills

Skills compose naturally. Common combinations:

| Workflow | Skills Used |
|----------|------------|
| Feature development | test-strategy → tdd-workflow → e2e-testing → verification-loop |
| Bug fix | qa → tdd-workflow (reproduce) → fix → ai-regression-testing |
| Release prep | qa → e2e-testing → visual-regression → load-testing → verification-loop |
| Refactor safety | ai-regression-testing → tdd-workflow (add coverage) → verification-before-completion |
