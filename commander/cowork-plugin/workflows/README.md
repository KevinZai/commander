# Workflows

`*.workflow.js` files here are scripts for the Workflow tool. They are exposed to users as `/commander:ccc-*` skills by the host, so skills and menus may reference `/ccc-audit`, `/ccc-deep-review`, `/ccc-fleet` (which also has a skill), `/ccc-migrate`, `/ccc-prompt-audit` and `/ccc-release-audit` even though, except for `ccc-fleet`, no `skills/<name>/SKILL.md` exists for them.

Convention for tooling: a skill-reference check must resolve a `/ccc-<name>` reference against both `skills/<name>/SKILL.md` and `workflows/<name>.workflow.js`. Resolving against `skills/` alone reports false positives for these names.
