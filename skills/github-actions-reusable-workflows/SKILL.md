---
name: github-actions-reusable-workflows
description: "GitHub Actions reusable workflows — workflow_call, composite actions, matrix strategies, caching, and DRY CI/CD patterns."
risk: low
source: custom
date_added: '2026-03-20'
---

# GitHub Actions Reusable Workflows

Expert guide to DRY CI/CD with reusable workflows and composite actions.

## Use this skill when

- Creating shared CI/CD patterns across repositories
- Building composite actions for common tasks
- Optimizing workflow performance with caching and matrix strategies
- Reducing duplication across workflow files

## Do not use this skill when

- Building a single simple workflow (see github-actions-templates)
- Securing existing workflows (see github-actions-security)

## Instructions

1. Identify repeated patterns across workflows.
2. Extract into reusable workflows or composite actions.
3. Parameterize with inputs and secrets.
4. Test and version appropriately.

---

## Reusable Workflow (workflow_call)

```yaml
# .github/workflows/reusable-build-and-test.yml
name: Build and Test (Reusable)

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
      working-directory:
        required: false
        type: string
        default: '.'
      run-e2e:
        required: false
        type: boolean
        default: false
    secrets:
      NPM_TOKEN:
        required: false
    outputs:
      coverage:
        description: "Test coverage percentage"
        value: ${{ jobs.test.outputs.coverage }}

jobs:
  lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          cache-dependency-path: ${{ inputs.working-directory }}/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    outputs:
      coverage: ${{ steps.coverage.outputs.percentage }}
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - id: coverage
        run: echo "percentage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')" >> $GITHUB_OUTPUT

  e2e:
    if: inputs.run-e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### Calling the Reusable Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    uses: ./.github/workflows/reusable-build-and-test.yml
    with:
      node-version: '20'
      run-e2e: ${{ github.event_name == 'push' }}
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
    secrets: inherit  # Pass all secrets
```

## Composite Actions

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Install dependencies with caching'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'
  install-playwright:
    description: 'Install Playwright browsers'
    required: false
    default: 'false'

runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'

    - name: Install dependencies
      shell: bash
      run: npm ci

    - name: Install Playwright
      if: inputs.install-playwright == 'true'
      shell: bash
      run: npx playwright install --with-deps chromium

    - name: Cache Playwright
      if: inputs.install-playwright == 'true'
      uses: actions/cache@v4
      with:
        path: ~/.cache/ms-playwright
        key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

```yaml
# Usage in workflow
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-project
    with:
      install-playwright: 'true'
  - run: npm test
```

## Matrix Strategies

```yaml
jobs:
  test:
    strategy:
      fail-fast: false  # Don't cancel other matrix jobs on failure
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [18, 20, 22]
        exclude:
          - os: macos-latest
            node: 18
        include:
          - os: ubuntu-latest
            node: 20
            coverage: true  # Only collect coverage on one combo

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test ${{ matrix.coverage && '-- --coverage' || '' }}
```

## Caching Patterns

```yaml
# Dependency caching (built into setup-node)
- uses: actions/setup-node@v4
  with:
    cache: 'npm'

# Custom caching for build artifacts
- uses: actions/cache@v4
  with:
    path: |
      .next/cache
      node_modules/.cache
    key: build-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ hashFiles('src/**') }}
    restore-keys: |
      build-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
      build-${{ runner.os }}-

# Docker layer caching
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Cross-Repository Reusable Workflows

```yaml
# Organization shared workflow: myorg/.github/workflows/deploy.yml
# Called from any repo in the org:
jobs:
  deploy:
    uses: myorg/.github/.github/workflows/deploy.yml@main
    with:
      environment: production
    secrets: inherit
```

## Common Pitfalls

1. **Secrets not available in reusable workflows** — Must be explicitly passed or use `secrets: inherit`.
2. **Over-nesting workflows** — Reusable workflows can call other reusable workflows, max 4 levels deep.
3. **No versioning** — Pin reusable workflows to tags or SHA, not `@main`.
4. **Cache key collisions** — Include OS, lockfile hash, and relevant source hashes in cache keys.
5. **Matrix explosion** — Large matrices waste CI minutes. Use `exclude` and `include` strategically.
6. **Missing `fail-fast: false`** — Default is true, which cancels all matrix jobs on first failure.
