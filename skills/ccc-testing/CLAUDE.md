# KZ Mega-Testing — Architecture

This CCC domain contains 15 testing specialist skills covering the full testing lifecycle.

## Skill Map

### Foundation
- `testing-router/` — Central routing (start here)
- `test-strategy/` — Testing strategy generation

### Unit & TDD
- `tdd-workflow/` — Red/green/refactor methodology
- `plankton-code-quality/` — Write-time quality checks
- `python-testing/` — Python-specific (pytest)

### Integration & E2E
- `e2e-testing/` — Playwright E2E
- `webapp-testing/` — Playwright for local apps

### Visual & Performance
- `visual-regression/` — Screenshot comparison
- `load-testing/` — k6/Artillery load tests

### Quality Assurance
- `qa/` — Find and fix bugs
- `qa-only/` — Report bugs only
- `ai-regression-testing/` — AI-assisted regression detection

### Verification
- `verification-loop/` — Multi-step verification
- `verification-before-completion/` — Proof-of-work
- `eval-harness/` — Eval-driven development

## Usage Flow
1. Start with `test-strategy` for new projects
2. Use `tdd-workflow` during development
3. Use `e2e-testing` for critical paths
4. Use `qa` before releases
5. Use `verification-loop` before marking done

## Anti-Patterns
- Don't write tests after the code is done (use TDD)
- Don't skip E2E for user-facing features
- Don't confuse `qa` (fix bugs) with `qa-only` (report only)
- Don't load-test without establishing baselines first
