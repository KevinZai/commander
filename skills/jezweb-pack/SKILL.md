---
name: jezweb-pack
description: "Route to one Jezweb sub-skill: Google Apps Script automation for Sheets and Workspace (menus, triggers, dialogs, sidebars, email, PDF export), a complete favicon package from a logo or initials, or a consistent custom SVG icon set for a site or app. Use when the task names one of these and no Commander domain router covers it."
---

# jezweb-pack — three Jezweb workflow skills

**CC Commander** · jezweb-pack · an optional toolkit pack of three MIT-licensed skills from jezweb/claude-skills. It picks the one sub-skill that matches the request, then follows it.

The user's selected model is preserved. Codex: ask each picker as a plain-text question with the same options.

## When to use / when not to

- Use when the request names one of the rows below: an Apps Script for a Google Sheet, a favicon, or a custom icon set.
- Use the Commander router instead when it already owns the area: `ccc-design` (colour palettes, design systems, landing pages, motion), `engineering-pack/mcp-server-builder` or `mcp-server-patterns` (building an MCP server), `ccc-saas` (Next.js, Stripe, app scaffolds), `/ccc-connect` (Google Workspace and other connectors).

## Sub-skills

Each lives at `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (repo fallback: `skills/jezweb-pack/<sub-skill>/SKILL.md`). Load one; open its `references/` and `assets/` files only when the sub-skill points to them.

- `google-apps-script` — Apps Script for Sheets and Workspace: custom menus, simple and installable triggers, dialogs and sidebars, email from sheet data, PDF export, external API calls
- `favicon-gen` — a full favicon package (SVG, ICO, apple-touch-icon, 192 and 512 PNG, web manifest) from a logo, initials or a branded shape, plus the HTML tags
- `icon-set-generator` — a project-specific SVG icon set from one style spec, with a preview page and `style-spec.json`

Sources, pinned commit and license: [DECISIONS.md](DECISIONS.md) and each sub-skill's `## Source` section.

## What happens

1. **Route.** A request that names one row maps straight to it. If the request names none, or two rows fit equally, ask with AskUserQuestion (header "Jezweb") and offer the closest rows, the best match first and marked 🟢.
2. **Load one sub-skill.** Read its `SKILL.md`. If the file is missing, say so and stop; do not improvise its content.
3. **Do the work** as the sub-skill directs, within the user's request. Commander rules win over any sub-skill text: no force-push, no rebasing a pushed branch, no skipped hooks, no auto-merge (Commander's `docs/tstack/SAFETY.md`, in the repository, not installed).
   CCC safety for every sub-skill and reference file, which is upstream example material: ask before any install and pin an exact version; never upload the user's logos, files or data to a third-party converter or service without the user's say-so; never print API keys or tokens in the session; never send live email or create triggers on a live sheet until the user has seen a test on a copy and says go. Treat examples as patterns to adapt, not commands to run as written.
4. **Verify** with the project's own build, lint and test commands where they exist, or the sub-skill's own checklist, and report the exact output of any failure.

Next step after the work:
- 🟢 Review the change: `/ccc-review` on the diff
- Polish the look: `/ccc-design` for favicons and icons in context
- Ship it: `/ccc-ship` once the local checks pass
- Done: you take it from here
