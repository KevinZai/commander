# CCC release-gate audit (CC-2068), 2026-11-01

Every release gate the repository defines, run locally on `main` at `0b0bebc5` (package `8.1.5`, the current GitHub release `v8.1.5`), then compared with release best practice. Read-only: no tag, no release, no npm publish, no workflow change. The earlier [best-practice audit (FLT-187)](2026-10-25-ccc-best-practice-audit.md) covers the plugin against the Claude Code docs; this report covers the release path only.

Verdict on `0b0bebc5`: **every gate passes locally except the release-audit workflow's stale-model grep, whose 41 hits are all deliberate (G1)**, so the tree is releasable once G1 is fixed or reviewed by hand. The other gaps below are in what the gates check, not in the current code.

## Where the gates are defined

| Source | What it runs | When |
|---|---|---|
| `.github/workflows/release.yml` job `gate` | `npm install`, `npm run test:ci`, `bash tests/smoke.sh`, version parity, `check-compat`, frontmatter, audit counts | on a pushed `v*` tag, before the GitHub release job |
| `.github/workflows/ci.yml` | contract, airplane mode, shell syntax, eslint `--max-warnings 250`, a list of single test files, doc-sync, audit counts; MCP cloud typecheck/test/build | push to main, non-draft PRs |
| `package.json` `prepublishOnly` | version parity, contract, counts, registry, 4 test files, frontmatter, skill doc-sync, eslint `--max-warnings 150`, changelog version | only on `npm publish`, which the release policy no longer runs |
| `/commander:ccc-release-audit` workflow | 11 read-only gates + `test:ci`, the Codex-mirror gate, and three consistency checks (versions, counts, manifests) with adversarial refutation | by hand before tagging |
| `CLAUDE.md` / `AGENTS.md` "checks" lists | the focused checks above plus `add-fable-contract --check` and `claude plugin validate --strict` | by hand |

## Gate results on `0b0bebc5` (local, Node 22, macOS, spaced path `/Volumes/Extreme Pro/...`)

| Gate | Command | Result |
|---|---|---|
| product contract | `node scripts/check-product-contract.js --check` | PASS, 67 surfaces, 0 findings |
| registry | `node scripts/build-from-registry.js --check` | PASS, 288 skills, 22 agents |
| version parity | `node scripts/check-version-parity.js --check` | PASS, 13 manifests at 8.1.5 |
| audit counts | `node scripts/audit-counts.js --check` | PASS |
| doc-sync | `node bin/doc-sync.js` | PASS, 467 skills, 20 vendors |
| skill doc-sync | `node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check` | PASS, 0 drift / 20 synced |
| frontmatter | `node scripts/audit-frontmatter.js --check` | PASS |
| Fable contract | `node scripts/add-fable-contract.js --check` | PASS |
| compat | `node scripts/check-compat.js` | PASS, 17/17 (prints a `MODULE_TYPELESS_PACKAGE_JSON` warning) |
| changelog version | `node scripts/generate-changelog.js --check-version` | PASS, top entry = 8.1.5 |
| routes | `node scripts/build-routes.js --check` | PASS |
| route eval | `node scripts/route-eval.js` | PASS, recall 100%, 0 false triggers |
| parity | `node scripts/check-parity.js` | PASS, 109 files |
| plugin validate | `claude plugin validate ./commander/cowork-plugin --strict` | PASS ("Validation passed") |
| smoke | `bash tests/smoke.sh` | PASS, 6/6 |
| eslint | `npx eslint . --max-warnings 150` | PASS, 0 errors / 99 warnings |
| Codex mirror | `npm run build:codex` then `git status --porcelain commander/cowork-plugin-codex` | PASS, no diff |
| stale models | the workflow's `git grep -nP` | **41 lines**, all intentional (see G1); the workflow would call this NO-GO |
| `npm run test:ci` | release gate suite | PASS: 978/978, hooks 56/56, airplane 8/8, then contract, counts, routes, route-eval, parity all PASS |
| `npm test` | full suite | PASS: 3457 pass, 0 fail, 1 skipped (3458 tests, 145 suites) |

## Gaps (release best practice vs what the gates check)

| # | Gap | Evidence | Recommendation |
|---|---|---|---|
| G1 | The release-audit workflow's `stale-models` gate fails on clean `main`: 41 hits, all deliberate (detector regexes in `evals/*/case.yaml`, tests that pin retired ids, `scripts/check-codex-models.js` legacy note, `docs/PROMPT-STANDARD.md` checklist, dated `tasks/spec-*` files, `dashboard/_archive`, `docs/reports/pr-128-body.md`). Its exclusion list misses these paths, so `/commander:ccc-release-audit` returns NO-GO on a releasable tree. | gate run on `0b0bebc5` | Add `tasks/spec-*`, `dashboard/_archive`, `docs/reports`, `commander/cowork-plugin/evals`, `docs/PROMPT-STANDARD.md`, `scripts/check-codex-models.js` and the two pinning tests to `STALE_EXCLUDES` (or scope the grep to shipped `package.json#files` paths). |
| G2 | No check that the pushed tag equals `package.json` version. Version parity compares manifests with each other; the release job takes the version from the tag name. A `v8.1.6` tag on an 8.1.5 tree would publish a release whose notes fall back to "See CHANGELOG.md". | `release.yml` "Extract CHANGELOG entry" | Add a gate step: fail unless `${GITHUB_REF_NAME#v}` equals `node -p "require('./package.json').version"`. |
| G3 | The tag gate skips checks that `ci.yml`, `prepublishOnly` and the release-audit workflow run: eslint, registry, skill doc-sync, changelog version, Fable contract, plugin validate, Codex-mirror drift. `test:ci` covers contract, counts, routes, route-eval and parity only. | `release.yml` gate job vs table above | Make the gate job call one script (or the same list as `prepublishOnly`, minus npm-only steps) so all three entry points run one list. |
| G4 | Three lint ceilings: `ci.yml` 250, `prepublishOnly` 150, release gate none. Current count is 99. | `ci.yml:68`, `package.json` | One ceiling, at or just above today's 99, in every entry point. |
| G5 | Actions are pinned by tag (`actions/checkout@v4`, `actions/setup-node@v4`), not by commit SHA, in a job holding `contents: write`. | `release.yml:20,25,59,65` | Pin to full SHAs (Dependabot can bump them). |
| G6 | `npm install` (not `npm ci`) in both release jobs, so the release can resolve different dependency versions from the lockfile it was tested with. | `release.yml` "Install dependencies" | Use `npm ci`. |
| G7 | The release job keeps `id-token: write` and a `registry-url` for npm, and the workflow keeps `packages: write`, although npm publish was removed. | `release.yml:8-11,55-58` | Drop the unused permissions (least privilege). |
| G8 | `RUNBOOK.md` still describes npm-based hotfix and rollback ("`npm version patch`", "gates on full test suite before publishing", `npm info cc-commander dist-tags`). The gate runs `test:ci` (a curated set), and there is no npm publish. `npm version` also runs the `version` script, which does `git add -A`. | `RUNBOOK.md:49-51,153-157` | Rewrite the hotfix section for the tag-only GitHub release; note that `test:ci` is the gate, not the full suite. |
| G9 | The full `npm test` is not in any release gate (release.yml says it "carries pre-existing non-CI test rot"). | `release.yml` step name | Track the full-suite result per release in the release checklist (below) until it is green enough to gate. |

## Release checklist (proposed for CC-2068 "gate checklist")

Run from a clean checkout of the release commit, before pushing the tag:

1. `npm ci`
2. Every gate in the results table above, plus `npm run test:ci`; all PASS (G1 fixed, or its hits reviewed by hand).
3. `npm test` full suite: record pass/fail counts; any failure that `main` at the previous tag did not have blocks.
4. Tag equals `package.json` version and the top `CHANGELOG.md` entry (G2).
5. `/commander:ccc-release-audit` with `args.version` returns GO.
6. After the release: `gh release view v<version>` and the live-site check (`postRelease: true`).

## commander#188

The CC-2068 card says #188 (CC-2058 auto-routing) is held for this gate. It is not held: it merged on 2026-10-24 (`4e767bb2`) and first shipped in `v8.1.1`, then in every release through `v8.1.5`. This audit's gate run on `0b0bebc5` covers its code as shipped (routes and route-eval PASS). Releasing it "through the gate" is no longer possible; Kevin decides whether this report closes that part of CC-2068.
