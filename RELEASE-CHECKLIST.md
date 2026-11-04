# Release checklist

Run from a clean checkout of the exact commit you will tag, before pushing the tag. Releases are tag-only GitHub releases; there is no npm publish. Source: the CC-2068 release-gate audit, [docs/reports/2026-11-01-ccc-release-gate-audit.md](docs/reports/2026-11-01-ccc-release-gate-audit.md) (gaps G1-G9). Rollback and hotfix steps are in [RUNBOOK.md](RUNBOOK.md).

One gate list serves every entry point: `scripts/release-gate.js` runs in the tag workflow (`.github/workflows/release.yml`), as `prepublishOnly`, as `npm run release:gate`, and in the steps below. Add a new gate there, not in a workflow.

## Before the tag

1. `git status --short` is empty and `HEAD` is the commit you will tag.
2. `npm ci` (the lockfile the release is tested with; never `npm install`).
3. Version: `node scripts/bump-version.js <version>` was committed, the top `CHANGELOG.md` entry is `## [<version>]`, and the `CLAUDE.md` release-check marker matches.
4. `node scripts/release-gate.js --tag v<version> --require-plugin-validate` prints `GO`. It runs, in order:
   - tag = `package.json` version = top `CHANGELOG.md` entry (G2)
   - version parity, product contract, audit counts, registry, frontmatter, Fable contract, doc-sync, skill doc-sync, compat, changelog version, routes, route eval, parity (G3)
   - lint at the single ceiling in `package.json` `lint` (G4; CI calls the same script)
   - Codex mirror drift, and `claude plugin validate ./commander/cowork-plugin --strict` (needs the `claude` CLI; the tag workflow logs it as SKIP, so it must pass here)
   - `npm run test:ci`, `bash tests/smoke.sh` and the full `npm test` suite (G9)
5. Record the full-suite counts (pass / fail / skipped) in the release PR or tracking issue. Any failure that the previous tag did not have blocks the release.
6. `/commander:ccc-release-audit` with `args.version = "<version>"` returns GO. Its stale-model grep excludes only deliberate hits (G1); a new hit is a real finding.
7. `node scripts/build-codex.js` leaves `git status --porcelain commander/cowork-plugin-codex` empty.

## Tag and release

8. `git tag v<version> && git push origin v<version>`. The `gate` job reruns `release-gate.js --tag`, then the `release` job creates the GitHub release with the CHANGELOG section as notes. Workflow actions are pinned by commit SHA (G5), installs use `npm ci` (G6), and the workflow holds only `contents` scope (G7).
9. Never move or delete a pushed tag. A bad release is fixed with a new version (RUNBOOK.md, Scenario 1).

## After the release

10. `gh release view v<version>` shows the release and the expected notes.
11. `/commander:ccc-release-audit` with `args.version` and `postRelease: true`: the GitHub latest release and the live site both name the new version.
