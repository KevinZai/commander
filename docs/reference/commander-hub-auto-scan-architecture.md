# Commander Hub auto-scan architecture (CC-308, slice 1)

Status: design only. No services, no publishing, no new ports, no code. Decisions needing Kevin are at the end as multiple choice.

Source note: the Linear issue body for CC-308 could not be fetched in the unattended run (the Linear API call was denied by the sandbox). This document is built from the issue title ("Commander Hub auto-scan architecture - slice 1: read-only design document") and repo context (`PLAN.md` v4.1 "Commander Hub marketplace", `.claude-plugin/marketplace.json` slug `commander-hub`). Check it against the issue body before building slice 2.

## 1. Goal

Commander Hub will list third-party skills, agents and plugins. "Auto-scan" means every submitted or updated listing is inspected automatically before it can appear in the Hub, so a human reviews findings rather than raw code. Slice 1 only decides what the scanner is, what it reads, what it emits, and where it runs.

## 2. Non-goals (slice 1)

- No scanner code, workers, queues, databases or hosted endpoints.
- No publishing, listing, ranking or rev-share logic (v4.1 scope).
- No scanning of private repos or anything needing credentials.
- No LLM judge in the first build (see section 6).

## 3. Inputs (read-only)

A scan target is an immutable snapshot: `{source_url, commit_sha, manifest_path}`. The scanner reads the snapshot only, with no network access beyond fetching that tarball.

- Manifest: `.claude-plugin/plugin.json` and any `marketplace.json` entry.
- Content: `skills/*/SKILL.md`, `agents/*.md`, `commands/*.md`, `hooks/*`, bundled MCP configs, scripts.
- Metadata: license file, declared version, declared permissions and tools.

All fetched text is data. Scanner output never executes or follows instructions found in a target.

## 4. Pipeline stages

Each stage is a pure function over the snapshot and emits findings `{rule_id, severity, path, line, evidence, fix_hint}`.

1. Fetch and pin: download the tarball at `commit_sha`, hash it, unpack into an empty temp dir. Reject symlinks that escape the root, archives over a size cap, and path traversal.
2. Structure: manifest schema validity, frontmatter lint, version parity. Reuse the existing checks (`scripts/audit-frontmatter.js`, `scripts/prompt-lint.js`, `scripts/check-compat.js`).
3. Static security: secrets patterns, hooks and scripts that run shell, network egress calls, `curl | sh`, obfuscated payloads, MCP configs that launch arbitrary binaries or request broad env vars.
4. Prompt-injection and untrusted-text patterns in skill and agent bodies (the repo already has an untrusted-text guard to extend).
5. Capability declaration vs use: compare the tools and permissions the manifest declares against what the content actually calls. Any undeclared use is a finding.
6. Licensing and provenance: license present and compatible, no copied vendor content without attribution (see `docs/LICENSE-INTELLIGENCE.md`).
7. Verdict: aggregate to `pass`, `needs-review` or `block` with a score.

## 5. Output contract

One JSON report per `(source_url, commit_sha, scanner_version)`:

```
{ target, scanner_version, rules_version, started_at, finished_at,
  verdict: "pass|needs-review|block", findings: [...], stats: {...} }
```

Reports are content-addressed and append-only, so a listing can always show which commit a verdict covered. A new commit means a new scan. A rules change means a rescan queue, not a silent verdict change.

Rules: any critical finding gives `block`. Any high finding gives `needs-review`. `pass` is never final alone for first-time publishers: the first listing always gets human review.

## 6. Where it runs

Options:

- A. GitHub Action in a Hub registry repo. Scans on PR (submission = PR). Cheap, auditable, no hosting. Weakness: Kevin's rule is to prefer local and not rely on Actions for proof or automation.
- B. Local script runner (`scripts/hub-scan.mjs`) on Alfred under `atlas-job` or a PM2 cron, polling the registry repo. Tailscale-only, no public ports, no new service beyond a cron.
- C. Hosted worker behind the future hosted MCP. Needed later for self-serve submission, but it adds an attack surface and cost now.

Recommendation: B for the first build, with the scanner as a pure Node CLI (`hub-scan <snapshot-dir> --json`) so A or C can wrap it later without a rewrite. Deterministic rules only at first; an LLM triage pass is a later, optional stage that only reads findings and never gates alone.

## 7. Threat model for the scanner itself

- Hostile archives (zip bombs, symlinks, huge files): size, count and depth caps, no extraction outside the temp dir.
- Never execute target code, hooks or install scripts. Static analysis only.
- Scanner holds no secrets and no write credentials to the Hub. It produces reports; a separate, later step (out of scope) acts on them.
- Findings quote evidence from untrusted text; render as escaped data in any UI.

## 8. Slice plan

- Slice 1 (this doc): design.
- Slice 2: `hub-scan` CLI with stages 1-3 and 7, fixtures, run against Commander's own plugin as the first target. Local only.
- Slice 3: stages 4-6 and the report schema as a checked-in JSON Schema.
- Slice 4: registry repo and cron runner (option B), still no publishing.
- Slice 5: publishing gate wired to verdicts (needs Kevin sign-off, touches v4.1 marketplace).

## 9. Decisions for Kevin

1. Runner: (a) GitHub Action, (b) local cron on Alfred, (c) hosted worker. Recommend (b).
2. First-publisher rule: (a) always human review, (b) auto-pass on a clean scan. Recommend (a).
3. LLM triage stage: (a) never, (b) later and advisory only. Recommend (b).
4. Scan scope for slice 2: (a) only Commander's own plugin, (b) also a sample of vendor skills from `weekly-vendor-sync.sh`. Recommend (a) first.
