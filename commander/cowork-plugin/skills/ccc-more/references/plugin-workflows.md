# Commander plugin workflows

The plugin ships Workflow-tool scripts in `${CLAUDE_PLUGIN_ROOT}/workflows/`. Each runs as `/commander:<name>` or through the Workflow tool:

```
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/<name>.workflow.js", args: { … } })
```

Every workflow starts parallel agents and returns one structured result to the session. The live list is `ls "${CLAUDE_PLUGIN_ROOT}/workflows/"*.workflow.js`; if it disagrees with this table, the directory wins.

| Command | Returns | Arguments (defaults) | Without the Workflow tool |
|---|---|---|---|
| `/commander:ccc-audit` | Repo health scorecard: one finder per dimension, each finding adversarially verified | `target` (`.`), `dimensions` (any of quality, security, performance, deps, tests, docs, ci; default all), `maxPerDimension` (12) | `/ccc-xray full` |
| `/commander:ccc-deep-review` | Branch review against a base ref, severity-grouped verdict, findings refuted or confirmed | `base` (`main`), `maxPerDimension` (15) | `/ccc-review` |
| `/commander:ccc-fleet-run` | Multi-agent run: fan-out with verifiers, pipeline, judge panel, or debate | `mode` (`fanout` · `pipeline` · `judge` · `debate`, required); `tasks` (fanout, pipeline ≥ 2) or `task` (judge, debate); `attempts` (3), `lenses` | `/ccc-fleet` (Agent-based flow) |
| `/commander:ccc-migrate` | Site-by-site migration, each site transformed in its own worktree and checked by a skeptic | `pattern`, `transform` (required); `verify`, `maxSites` (200) | `/ccc-fleet` migration path |
| `/commander:ccc-prompt-audit` | Per-file verdict of plugin prompts against `docs/PROMPT-STANDARD.md`; read-only | `root` (`commander/cowork-plugin`), `paths`, `standard`, `maxFiles` (400) | none; say so |
| `/commander:ccc-release-audit` | Go or no-go with blockers after running every repository release gate; read-only | `version`, `skipTests`, `postRelease`, `repo`, `site` | none; say so |

Notes:

- `ccc-prompt-audit` and `ccc-release-audit` are for the Commander repository itself. Run them only from that repository's root; elsewhere, say they do not apply.
- `ccc-release-audit` runs gates and checks. It never commits, tags, pushes or publishes.
- `ccc-fleet-run` and `ccc-migrate` need arguments the user must supply; route through `/ccc-fleet`, which collects them with a picker and maps them to workflow args.
- `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`, when set, pins every workflow agent's model. Otherwise the workflow's own routing applies; the session model is not changed.
- On Codex there is no Workflow tool. Use the fallback column, or `codex exec --json` for a single bounded task.
