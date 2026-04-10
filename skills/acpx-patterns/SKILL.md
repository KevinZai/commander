---
name: acpx-patterns
description: Pre-built acpx usage patterns for background, parallel, and crash-resilient sessions
version: 1.1.0
category: devops
---

# ACPX Patterns

Pre-built patterns for using `acpx` (Agent Control Protocol eXtended) to run Claude Code sessions in advanced modes.

## Background Monitor

Long-running monitoring session that watches for changes and reports:

```bash
acpx run --background --name "monitor" \
  --prompt "Watch for file changes in src/ and run tests on each change. Report failures." \
  --max-turns 100 \
  --allowed-tools Bash,Read,Glob,Grep
```

## Parallel Development

Run multiple independent tasks simultaneously:

```bash
# Task 1: Frontend work
acpx run --background --name "frontend" \
  --prompt "Implement the dashboard component per spec in tasks/spec-dashboard.md" \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep

# Task 2: Backend work
acpx run --background --name "backend" \
  --prompt "Implement the API endpoints per spec in tasks/spec-api.md" \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep

# Task 3: Tests
acpx run --background --name "tests" \
  --prompt "Write integration tests for the existing API routes" \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep

# Check status
acpx status --all
```

## Crash-Resilient Overnight

Overnight execution with automatic retry and checkpoint:

```bash
acpx run --background --name "overnight-build" \
  --prompt "Execute the full implementation plan in tasks/plan-*.md. Checkpoint after each phase. If a step fails, log the error and continue to the next phase." \
  --max-turns 200 \
  --timeout 28800 \
  --retry-on-crash 3 \
  --checkpoint-interval 10 \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep
```

## Structured Output

Run a task and capture structured JSON output:

```bash
acpx run --name "audit" \
  --prompt "Analyze this codebase and return a JSON report with: {health_score, issues[], recommendations[]}" \
  --output-format json \
  --allowed-tools Bash,Read,Glob,Grep
```

## Queue Management

Manage a queue of tasks to run sequentially:

```bash
# Add tasks to queue
acpx queue add --name "task-1" --prompt "Fix the auth bug in src/auth.ts"
acpx queue add --name "task-2" --prompt "Add rate limiting to API routes"
acpx queue add --name "task-3" --prompt "Update README with new API docs"

# Run queue (sequential, auto-advances)
acpx queue run --sequential --checkpoint-between

# Check queue status
acpx queue status
```

## Flows System (v0.5.3)

Flows are user-authored workflow modules with file-backed run state. Each step binds to a working directory, and runs produce trace bundles for replay and audit.

### BREAKING CHANGE: defineFlow() is now required

Flows that do not use `defineFlow()` will **fail on startup** as of v0.5.3. Update all existing flow files before upgrading.

```ts
// WRONG (pre-v0.5.3) — will fail on startup
export default {
  steps: [...]
}

// CORRECT (v0.5.3+) — required
import { defineFlow } from "acpx/flows";

export default defineFlow({
  name: "my-workflow",
  steps: [...]
})
```

### Defining a Flow

```ts
import { defineFlow } from "acpx/flows";

export default defineFlow({
  name: "deploy-pipeline",
  permissions: ["read", "write", "bash"],   // explicit permission mode declarations
  steps: [
    {
      name: "lint",
      cwd: "./packages/app",                // per-step cwd binding
      timeout: 300,                          // seconds (default: 900 = 15 min)
      run: "Check for TypeScript errors and lint violations. Output a JSON summary.",
    },
    {
      name: "test",
      cwd: "./packages/app",
      run: "Run the full test suite. Fail fast on any error.",
    },
    {
      name: "build",
      cwd: "./packages/app",
      run: "Build production bundle. Output build stats.",
    },
  ],
});
```

### Running Flows

```bash
# Run a flow module
acpx flow run ./flows/deploy-pipeline.ts

# Run with prompt retry on transient failures (exponential backoff)
acpx flow run ./flows/deploy-pipeline.ts --prompt-retries 3

# Suppress raw file-read bodies from text/JSON output
acpx flow run ./flows/deploy-pipeline.ts --suppress-reads

# Run in background
acpx flow run ./flows/deploy-pipeline.ts --background --name "deploy-run-1"

# Check status
acpx flow status deploy-run-1
```

### Trace Bundles

Every flow run produces a trace bundle:

```
.acpx/traces/deploy-run-1/
├── manifest.json      # run metadata (steps, timings, exit codes)
├── trace.ndjson       # step-by-step event log (newline-delimited JSON)
└── receipts/          # ACP receipts per step
    ├── lint.json
    ├── test.json
    └── build.json
```

Inspect a trace bundle:

```bash
# View manifest
cat .acpx/traces/deploy-run-1/manifest.json

# Stream trace events
acpx flow trace deploy-run-1

# Open the visual replay viewer (React Flow-based)
acpx flow replay deploy-run-1
```

### Live WebSocket Updates

Subscribe to in-progress flow run events:

```bash
# Watch live output (WebSocket stream to stdout)
acpx flow watch deploy-run-1
```

Or connect programmatically:

```ts
import { connectFlow } from "acpx/runtime";

const session = await connectFlow("deploy-run-1");
session.on("step:complete", (event) => console.log(event));
session.on("flow:done", () => session.close());
```

### Runtime Embedding API

Embed ACPX session lifecycle directly into your application:

```ts
import { createRuntime } from "acpx/runtime";

const runtime = createRuntime({
  flow: "./flows/deploy-pipeline.ts",
  permissions: ["read", "bash"],
  onStepComplete: (step, result) => {
    db.save({ step: step.name, output: result.text });
  },
});

await runtime.start();
await runtime.waitForCompletion();
```

### Built-in Adapters

ACPX v0.5.3 ships adapters for three external CLI tools:

```ts
import { defineFlow } from "acpx/flows";
import { factoryDroid, qoderCli, kiroCli } from "acpx/adapters";

export default defineFlow({
  name: "multi-tool",
  steps: [
    { name: "scaffold", adapter: factoryDroid({ template: "nextjs" }) },
    { name: "code-review", adapter: qoderCli({ strict: true }) },
    { name: "requirements", adapter: kiroCli({ spec: "./spec.md" }) },
  ],
});
```

| Adapter | Tool | Purpose |
|---------|------|---------|
| `factoryDroid` | Factory Droid CLI | Project scaffolding |
| `qoderCli` | Qoder CLI | AI-assisted code review |
| `kiroCli` | Kiro CLI | Requirements/spec generation |

### Migrating Existing Flows

Run the built-in codemod to wrap bare flow exports with `defineFlow()`:

```bash
acpx flow migrate ./flows/
```

Review the diff before committing — the codemod is mechanical but always check the inferred `name` and `permissions` fields.

---

## Best Practices

1. **Always name sessions** -- makes monitoring and log review easier
2. **Set max-turns** -- prevents runaway sessions from burning tokens
3. **Use allowed-tools** -- restrict to only what the task needs
4. **Checkpoint for long runs** -- enables resume after crashes
5. **Monitor costs** -- set `--cost-ceiling` for budget control
6. **Log output** -- pipe to file for post-session review: `acpx run ... 2>&1 | tee session.log`
7. **Use defineFlow()** -- required as of v0.5.3; run `acpx flow migrate` on any bare exports
8. **Declare permissions explicitly** -- `permissions` field in `defineFlow()` is the authoritative list for the run
9. **Pin per-step timeouts** -- default is 15 min; set lower for fast steps to surface hangs early
10. **Archive trace bundles** -- `.acpx/traces/` grows unbounded; prune or archive after each run
