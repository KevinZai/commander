# Workflows

`*.workflow.js` files here are scripts for the Workflow tool. The host exposes each one as a `/commander:<name>` skill, so skills and menus may reference `/ccc-audit`, `/ccc-deep-review`, `/ccc-fleet-run`, `/ccc-migrate`, `/ccc-prompt-audit` and `/ccc-release-audit` although none of them has a `skills/<name>/SKILL.md`.

Convention for tooling: a check that resolves `/ccc-<name>` references must look in both `skills/<name>/SKILL.md` and `workflows/<name>.workflow.js`. Checking `skills/` alone reports these names as broken.
