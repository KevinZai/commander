# /ccc-browse cascades

All names, descriptions and counts come from disk at run time. `R` is `${CLAUDE_PLUGIN_ROOT}` (repo fallback `commander/cowork-plugin`).

## Shared picker shape

- At most four options per AskUserQuestion. Reserve one slot for "Next" while more remain, and add "Back" from the second page on.
- `label`: emoji plus name. `description`: the first sentence of the frontmatter `description`. Put detail in `preview` where the picker supports it.
- Keep a short page marker in your reply, for example "Page 2 of 3".

## Domains

Domain routers are plugin skills under `$R/skills/ccc-*/` that route to many sub-skills. List every `ccc-*` skill with its description:

```bash
for f in "$R"/skills/ccc-*/SKILL.md; do
  n=$(basename "$(dirname "$f")")
  d=$(sed -n 's/^description: *"\{0,1\}\(.*\)/\1/p' "$f" | head -1 | cut -c1-90)
  echo "$n|$d"
done
```

Offer the routers among them (design, marketing, saas, devops, seo, testing, security, data, research, mobile, makeover, and any newer router the listing shows). Show a sub-skill count only when you counted it from the router's own directory or SKILL.md in this turn. On a pick, invoke that router; it runs its own picker.

## Workflows

The click-first flows: `ccc-start`, `ccc-plan`, `ccc-build`, `ccc-review`, `ccc-ship`, `ccc-learn`, `ccc-xray`, `ccc-linear`, `ccc-fleet`, plus any listed by `menus/` that exist on disk. Check each exists before offering it. On a pick, invoke it.

## Agents

```bash
for f in "$R"/agents/*.md; do
  n=$(basename "$f" .md)
  d=$(sed -n 's/^description: *"\{0,1\}\(.*\)/\1/p' "$f" | head -1 | cut -c1-90)
  m=$(sed -n 's/^model: *//p' "$f" | head -1)
  echo "$n|$m|$d"
done
```

Option `preview`: "Best for: <use>. Model tier: <model alias>." On a pick, ask with AskUserQuestion:

- 🟢 Delegate a task to it now — ask for the task, then call the Agent tool with that agent
- Show the full definition — Read the file and render it
- Which flows use it — `grep -rl "<agent-name>" "$R/skills"`
- Back
