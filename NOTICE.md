# Third-Party Attribution

This distribution includes code derived from projects licensed under Apache License 2.0. Per Apache License 2.0 §4(d), we provide this notice of derived works:

## Apache-2.0 Derived Skills

The following skills contain code adapted from Apache-2.0 licensed sources:

- brand-guidelines — derived from Anthropic official skills
- canvas-design — derived from Anthropic official skills
- claude-api — derived from Anthropic official skills
- internal-comms — derived from Anthropic official skills
- slack-gif-creator — derived from Anthropic official skills
- theme-factory — derived from Anthropic official skills
- webapp-testing — derived from Anthropic official skills
- web-artifacts-builder — derived from Anthropic official skills

Each skill directory contains the full Apache 2.0 LICENSE.txt file with complete terms. These skills are redistributed under the same Apache-2.0 license.

For full license text and notices from upstream projects, see the LICENSE.txt file in each skill's directory.

## MIT-Derived Skills (tstack)

The following plugin skills are adapted from [t3dotgg/tstack](https://github.com/t3dotgg/tstack), pinned at `92e38e2cf677a84a142e8df296861c588542135c`. MIT License, Copyright (c) 2026 Theo Browne. Each skill directory under `commander/cowork-plugin/skills/` contains the full upstream `LICENSE.txt`, and each SKILL.md names its upstream path. The Codex plugin generated from it, `commander/cowork-plugin-codex/skills/`, ships the same nine skills with the same `LICENSE.txt` and attribution, under the same terms. CC Commander changes are marked "CCC safety:" and listed in `docs/tstack/SAFETY.md`.

- ccc-babysit-pr — from `skills/babysit-pr` (including `scripts/pr-wait`)
- ccc-council — from `skills/council`
- ccc-file-pr — from `skills/file-pr`
- ccc-full-send — from `skills/full-send`
- ccc-full-stop — from `skills/full-stop`
- ccc-modernize — from `skills/modernize`
- ccc-pr-comments — from `skills/leaving-pr-comments`
- ccc-sol-loop — from `skills/sol-loop`
- ccc-takeover — from `skills/takeover`

## Vendor Submodules

Vendor packages under `vendor/` are git submodules, each under its own license; the full table is in `vendor/LICENSE`.

- claude-code-playground (`vendor/claude-code-playground`, https://github.com/anthropics/claude-code-playground) — owned by Anthropic, PBC — Apache License 2.0. Upstream describes it as an Anthropic DevRel playground, provided as-is and not an official Anthropic product.

## MIT-Derived Skills (ponytail)

`skills/ponytail/SKILL.md` is copied from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), pinned at `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`, unchanged except for an added Source section. MIT License, Copyright (c) 2026 DietrichGebert; the full text is in `skills/ponytail/LICENSE.txt`. `skills/mode-switcher/modes/ponytail.md` summarizes the same rules as a CC Commander mode.

## Opt-in MIT add-ons (installed from upstream, not redistributed)

These toolkit skills only describe how to install and route to upstream projects. No upstream source is copied into this distribution.

- `skills/diagram-design` — [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design), MIT
- `skills/claude-video` — [bradautomates/claude-video](https://github.com/bradautomates/claude-video), MIT
- `skills/mempalace` — [MemPalace/mempalace](https://github.com/MemPalace/mempalace), MIT
- `skills/qmd` — [tobi/qmd](https://github.com/tobi/qmd), MIT
- `skills/codebase-memory-mcp` — [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp), MIT

## MIT-Derived Skills (threejs-pack)

`skills/threejs-pack/` holds 13 skills copied from [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills), pinned at `0e181866f095b5f06d005133876e926515390d95`. MIT License, Copyright (c) 2026 CloudAI-X; the full text is in `skills/threejs-pack/LICENSE.txt`. Each SKILL.md ends with a Source section naming its upstream path. Local changes: `threejs-interaction` normalizes selection coordinates against the canvas instead of the window.

## MIT-Derived Skills (addyosmani-pack)

`skills/addyosmani-pack/` holds 13 skills copied from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), pinned at `39b723ceebf81474d0557c1fecd01eddab585563`. MIT License, Copyright (c) 2025 Addy Osmani; the full text is in `skills/addyosmani-pack/LICENSE.txt`. CC Commander changes are marked "CCC safety:" (git-workflow-and-versioning, constraint-driven-development, browser-testing-with-devtools). `DECISIONS.md` lists the 12 upstream skills left out and the Commander skill covering each.
