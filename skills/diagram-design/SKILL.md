---
name: diagram-design
description: "Draw an architecture, flow, sequence, ER, timeline, quadrant, org chart or any of 50 diagram types as one self-contained HTML and SVG file in the project's brand, via the MIT diagram-design skill. Use when the user asks for a diagram, a chart of a system, or to import Mermaid, draw.io, Excalidraw or PlantUML."
tags: [design, diagrams, svg, architecture, docs]
---

# Diagram Design

Opt-in add-on. [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT) turns a plain request into one `.html` file with inline SVG: architecture, architecture delta, flowchart, sequence, state, ER and schema, swimlane, timeline, Gantt, quadrant, Wardley, Sankey, org chart, pyramid, treemap and more. It imports `.drawio`, Mermaid, `.excalidraw` and PlantUML, and can match a site's palette and fonts.

CC Commander does not copy its source (about 6 MB of references, icons and scripts). It installs from upstream so updates arrive through the plugin marketplace.

## Install

Claude Code (gets updates and the `/export-diagram`, `/import-mermaid`, `/import-plantuml`, `/profile` and `/doctor` commands):

```text
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

Any other Agent Skills host (Codex, Cursor, Cline, Windsurf): `npx skills add cathrynlavery/diagram-design`, updated with `npx skills update diagram-design`.

Check first: if `claude plugin list` already shows `diagram-design`, skip the install.

## When to route here

- `/ccc-design` or `/ccc-cheatsheet` needs a real diagram rather than ASCII or Mermaid.
- `/ccc-plan`, `/ccc-xray` or `/ccc-takeover` output would read better as an architecture or dependency picture.
- The user asks to restyle or import an existing Mermaid, draw.io, Excalidraw or PlantUML diagram.

On first use in a project the upstream skill asks whether to customize its default style guide. Let it ask; do not answer for the user.

## Limits

- Output is a static HTML file kept on the device. CCC safety: publish it as an Artifact or share it anywhere only when the user asks.
- Its `PRIVACY.md` lists what it sends over the network (brand onboarding fetches the URL the user gives).

## License

MIT, Copyright (c) Cathryn Lavery. It bundles Tabler Icons (MIT), Simple Icons (CC0) and others, listed in the upstream `THIRD_PARTY_LICENSES.md`.
