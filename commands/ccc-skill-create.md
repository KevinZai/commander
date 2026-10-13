---
name: ccc-skill-create
description: "Analyze the repository's git history for commit conventions, co-changing files, workflows and test patterns, and generate a SKILL.md (and optional instincts) that teaches them. Use when you want your team's practices captured as a project skill."
allowed-tools: ["Bash", "Read", "Write", "Grep", "Glob", "AskUserQuestion"]
---

# /ccc-skill-create — a project skill from git history

**CC Commander** · /ccc-skill-create · a reviewed `SKILL.md` describing how this repository is actually worked on.

## Arguments

`$ARGUMENTS`:

| Flag | Meaning |
|---|---|
| `--commits <n>` | Commits to analyze (default 200) |
| `--output <dir>` | Skills directory to write into (default `.claude/skills`) |
| `--instincts` | Also write instincts for the continuous-learning-v2 system |

## What happens

1. Confirm a git repository: `git rev-parse --show-toplevel`. If it fails, say so and stop. Use the top-level directory name as `<repo-name>`.

2. Gather history (replace `200` with `--commits`):

   ```bash
   git log -n 200 --name-only --pretty=format:"%H|%s|%ad" --date=short
   git log -n 200 --name-only --pretty=format: | grep -v '^$' | sort | uniq -c | sort -rn | head -20
   git log -n 200 --pretty=format:%s | head -50
   ```

   If the repository has fewer commits than requested, analyze what exists and report the actual count.

3. Detect patterns, each backed by evidence from step 2:

   | Pattern | How to detect |
   |---|---|
   | Commit conventions | Prefixes in subjects (`feat:`, `fix:`, `chore:`) and the share that follow them |
   | File co-changes | Files that appear in the same commits repeatedly |
   | Workflow sequences | Recurring sets of files changed for one kind of task |
   | Architecture | Folder structure and naming, from `git ls-files` |
   | Testing | Test file locations, naming, and the framework in the manifest |

   Report a pattern only when it recurs; give its count (for example "41 of 50 subjects use conventional prefixes").

4. Draft `<output>/<repo-name>-patterns/SKILL.md` in this shape:

   ```markdown
   ---
   name: <repo-name>-patterns
   description: "Coding conventions and workflows used in <repo-name>. Use when writing commits, adding features or tests in this repository."
   metadata:
     source: local-git-analysis
     analyzed_commits: <n>
   ---

   # <Repo name> patterns

   ## Commit conventions
   ## Code architecture
   ## Workflows   (numbered steps per recurring task, with the exact files and commands)
   ## Testing patterns
   ```

5. With `--instincts`, also draft one instinct per strong pattern in a single file `<output>/<repo-name>-patterns/instincts.yaml`:

   ```yaml
   ---
   id: <repo-name>-commit-convention
   trigger: "when writing a commit message"
   confidence: <0.0-1.0, from the observed share>
   domain: git
   source: local-repo-analysis
   ---
   # Use conventional commits
   ## Action
   Prefix commits with feat:, fix:, chore:, docs:, test:, refactor:
   ## Evidence
   <n> of <m> analyzed commits follow the format.
   ```

6. Show the drafts, then ask with AskUserQuestion (Codex: a plain-text question):

   - 🟢 Write the files — saves the skill (and instincts) to the output directory
   - Edit first — tell me what to change, then show the drafts again
   - Print only — nothing is written

7. After writing, verify: `ls -la <output>/<repo-name>-patterns/` and read `SKILL.md` back to confirm the frontmatter parses. If instincts were written, point to `/ccc-instinct-import <output>/<repo-name>-patterns/instincts.yaml` to load them.

For large histories or team sharing, the third-party Skill Creator GitHub App is an opt-in alternative; this command stays local.

## Done when

The skill file exists at the reported path with `name` and `description` frontmatter, and every pattern in it cites a count from the analyzed history.

## Guardrails

- Never overwrite an existing skill without asking; offer a new name or a diff instead.
- Never include secrets, emails or personal names from commit metadata in the generated files.
- Do not commit the generated files; leave them for the user to review.

## See also

`/ccc-instinct-import` · `/ccc-instinct-status` · `/ccc-evolve` · `/ccc-skill-health`
