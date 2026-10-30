# Source-tree drift checks (`/ccc-doctor full`)

Linked from [../SKILL.md](../SKILL.md) Step 6. The checks live in
[`../lib/diagnostics.js`](../lib/diagnostics.js); `runDiagnostics(root)` runs
them against a Commander repository root (the marketplace clone or a dev
checkout), not against the user's `~/.claude/` state, except where noted.
`/ccc-tuneup` consumes the same module, so the two skills report the same rows.

| Category | What it verifies |
|---|---|
| `claude-teams-flag` | `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is `"1"` in `~/.claude/settings.json` (needed for `/ccc-fleet` fan-out). Reads user settings. |
| `effort-default` | `effortLevel` in `~/.claude/settings.json` is a valid level (`low`, `medium`, `high`, `xhigh`, `max`) or unset. Reads user settings. |
| `license-cleanup` | No `license.json`, `licenseFile`, `tier === 'free'` or `isPro()` residue in plugin hooks. The core is free; any residue is a red flag. |
| `hook-chain` | Every script referenced from `hooks/hooks.json` exists and uses ESM `import`; orphan hook files are flagged. |
| `mcp-availability` | `.mcp.json` lists exactly the bundled servers and `CONNECTORS.md` advertises the expected opt-in connector rows. |
| `contract-integrity` | `commander/contract.json` exists, parses, and its counts match the filesystem. |
| `vendor-submodules` | `vendor/` directory count matches `contract.json` `vendor_submodules` and the `CLAUDE.md` release marker. |
| `bundled-mcp-servers` | The bundled MCP contract in `.mcp.json` matches the expected server set. |
| `agent-models` | Each sub-agent's `model:` is its current alias: deep agents on `fable`, writer/strategist/worker agents on `sonnet`, the rest on `opus`. Legacy dated ids from earlier generations fail (`LEGACY_MODEL_IDS` in `diagnostics.js`). |
| `test-suite` | `scripts/audit-frontmatter.js`, `scripts/audit-counts.js` and `scripts/check-version-parity.js` exist. Doctor checks presence only; the user runs each with `--check`. |
| `display-name` | `plugin.json.displayName` and the marketplace entry's `displayName` are both `Commander`. |
| `version-parity` | `package.json` and `plugin.json` versions match. The full check is `node scripts/check-version-parity.js`. |
| `critical-files` | `CHANGELOG.md`, `README.md`, `LICENSE`, `package.json` and `commander/core/registry.yaml` exist. |
| `network-mode` | Informational, always `ok`: shows telemetry, offline and ci-ticker on/off from `CCC_TELEMETRY`, `CCC_OFFLINE`, `CCC_CI_TICKER` and `~/.commander/config.json` (`lib/network-mode.js`). Reads user env and config. |

The expected values (bundled server names, connector row count, agent tiers)
are constants exported by `diagnostics.js`; read them there instead of copying
numbers into prose.

## Result shape

```
{
  category: string,          // e.g. 'hook-chain'
  status: 'ok' | 'warn' | 'fail',
  message: string,           // one-line summary
  remediation?: string       // present when status !== 'ok'
}
```

Doctor never blocks on these rows: a `fail` is diagnostic output, and the fix
belongs to `/ccc-tuneup` (local state) or a maintainer change (source tree).
