# Directory submission pack (CC-35)

Prepared 2026-10-21 against v8.1.0. **Nothing has been submitted.** Submission is a separate, human-approved step (outward-facing, hard to reverse).

Counts below come from `commander/contract.json`; re-run `node bin/doc-sync.js` and recheck before submitting.

## Validated facts

| Check | Result |
|---|---|
| Repo public | `https://github.com/KevinZai/commander` is PUBLIC |
| License | MIT (`LICENSE`, plugin.json, marketplace.json) |
| Plugin manifest | `claude plugin validate ./commander/cowork-plugin --strict` passes (2026-10-21) |
| Install | `/plugin marketplace add KevinZai/commander` then `/plugin install commander` (README) |
| Marketplace | `commander-hub`, plugin `commander` 8.1.0 (`.claude-plugin/marketplace.json`) |
| Counts | 84 plugin skills, 22 agents, 30 hooks / 51 handlers, 6 workflows, 8 evals, 2 bundled MCP servers (credential-free) + 16 opt-in |

The earlier draft (removed in 720c0674) used the stale repo `KevinZai/cc-commander`, "350+ skills" and a curl-pipe installer; do not reuse it.

## 1. awesome-claude-code (hesreallyhim/awesome-claude-code)

The older draft pointed at `anthropics/awesome-claude-code`; the widely used list is `hesreallyhim/awesome-claude-code` (listed in `BIBLE.md`). **Open item:** read that repo's CONTRIBUTING and issue templates before submitting; it may require an issue-template submission rather than a plain PR, and it may ask for a category. Suggested category: Tooling / Orchestrators (or Agent Skills).

Entry (adjust to the list's format):

```markdown
- [Commander](https://github.com/KevinZai/commander) - Guided AI PM plugin for Claude Code, Cowork Desktop and Codex: 84 click-first `/ccc-*` skills, 22 specialist sub-agents, lifecycle hooks, a HUD mod and verification-gated workflows. MIT, core free.
```

PR title: `Add Commander (guided PM plugin: skills, agents, hooks, workflows)`

PR body: one paragraph from the entry, the install commands above, and the license line. Disclose that the author maintains the project. Core is free; revenue is disclosed affiliates, consulting and sponsorship (see `CLAUDE.md`).

## 2. Claude plugin directory

Form: `clau.de/plugin-directory-submission` (not opened or submitted here). The validator notes that the directory also runs a safety scan and policy review that local validation does not.

Prepare before submitting:
- Name `commander`, repo URL, homepage `https://commanderplugin.com`, MIT, author Kevin Zicherman.
- Disclose opt-in connectors and the hosted MCP at `https://mcp.commanderplugin.com`; bundled MCPs need no credentials.
- Hooks: 30 lifecycle hooks run local Node handlers; be ready to explain that they are observe/guard only, with no network calls by default (verify before claiming).
- Screenshots: `scripts/marketplace-screenshot-capture.js`.

## Decision for Kevin

- A. Submit both now (needs your OK and the form login).
- B. 🟢 Submit awesome-claude-code first after reading its contribution rules, then the directory once the hooks/network claim is verified.
- C. Hold until the next release.
