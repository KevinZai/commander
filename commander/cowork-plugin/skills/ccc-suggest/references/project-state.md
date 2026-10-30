# /ccc-suggest — cached project state

`hooks/suggest-ticker.js` keeps one state file per project:

```
<config dir>/commander/projects/<slug>/project-state.json
```

The config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude` (`~/.claude/commander/projects/<slug>/project-state.json` by default).

`<slug>` is `basename(cwd)` + `-` + the first 8 hex characters of `sha256(cwd)` (`projectSlug()` in the hook). Locate the current project's file with:

```bash
CCC_STATE="${CCC_CONFIG_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}/commander"
ls -d "$CCC_STATE"/projects/"$(basename "$PWD")"-* 2>/dev/null
```

The flat `<config dir>/commander/project-state.json` is from an older layout and is no longer written; treat it as stale. The ticker refreshes the cached state on a throttle (`shouldRun()`), so check `timestamp` before relying on it, and prefer the live scan for anything load-bearing.

## Fields (as `computeState()` writes them)

```json
{
  "timestamp": "2026-07-10T01:15:00Z",
  "branch": "feature/xyz",
  "defaultBranch": "origin/main",
  "aheadMain": 3,
  "behindMain": 0,
  "hasClaudeMd": true,
  "claudeMdAgeDays": 12,
  "openTodos": 1,
  "lastSession": "~/.claude/sessions/2026-07-09-abc.tmp",
  "stack": ["nextjs", "tailwind", "supabase"],
  "testsStatus": "passing",
  "ciStatus": "passing",
  "lintStatus": "unknown",
  "securityAlerts": 0,
  "lintErrors": 0,
  "recommendedLevel": 2,
  "pmLenses": { "audit": true, "scope": false, "improve": false },
  "lastRecommendation": null
}
```

## Signal sources

- `ciStatus`: a cached `gh run list --limit 1 --json conclusion` (up to ~10 minutes old; a stale cache refreshes in a detached background process so the hook never blocks).
- `testsStatus`, `lintStatus`, `securityAlerts`: the PostToolUse cache at `<config dir>/commander/last-test-result.json` (30-minute TTL).
- `defaultBranch`: `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `origin/main`.
- Status values are `passing`, `failing` or `unknown`.
- `hasClaudeMd` and `claudeMdAgeDays` drive CLAUDE.md drift picks: `/ccc-claudemd` when older than 30 days, `/ccc-adopt` when missing.
- `pmLenses`: `audit` when the branch is ahead; `scope` when ahead with no todos file; `improve` when lint, CI or tests fail.
- `lastRecommendation`: written by explicit `/ccc-suggest` runs, not by the ticker.

## Loop state file

`/ccc-suggest loop` keeps `.claude/loop-state/ccc-suggest.json` in the project, following the `/ccc-loop` convention:

```json
{
  "iteration": 4,
  "lastRun": "2026-07-06T14:32:00Z",
  "attempted": ["/ccc-review diff", "/ccc-plan"],
  "dismissed": ["/ccc-ship preflight"],
  "history": []
}
```

A suggestion in `dismissed` is never re-surfaced unless its underlying signal changed materially (for example CI moved from passing to failing).
