# Claude Code settings that /ccc-settings manages

Linked from [../SKILL.md](../SKILL.md) Step 4. Each section names the key, its
values, where it lives, and whether this skill writes it. User settings are
`~/.claude/settings.json`; project settings are `.claude/settings.json` in the
repository; managed settings are installed by an administrator and are never
written by Commander.

## Permission mode

- Key: `permissions.defaultMode` in user or project settings.
- Values offered: `auto`, `default`, `acceptEdits`, `plan`. Other values
  (`dontAsk`, `bypassPermissions`) are not offered here; unattended setups go
  through `/ccc-yolo-setup`, which explains the trade-offs.
- Since Claude Code 2.1.284, interactive sessions start in **auto** mode when no
  mode is configured, so leaving the key unset means auto.
- In a running session, Shift+Tab cycles modes without changing the saved
  default.
- Plan mode is for requests that need a reviewed plan first; it is not the
  recommended default.

## Effort

- Key: `effortLevel` in user settings. Persisted values: `low`, `medium`,
  `high`, `xhigh`. `max` is session-only in Claude Code and is never saved as a
  default.
- In a session the user types `/effort` (slider) or `/effort <level>`.
- `/effort ultracode on|off` is a separate toggle (since 2.1.284). It does not
  force `xhigh`; the effort level and the ultracode toggle are independent.
- Higher effort spends more thinking tokens on every turn. `/ccc-tuneup`
  surfaces the spend trade-off; `high` is a sound default for most work.

## Model restrictions

- `availableModels` limits which models appear in the `/model` picker.
- `availableModelsMatch` and `deniedModels` (since 2.1.283) are managed
  settings: an administrator allows models by pattern or denies them outright.
- Model ids and aliases come from the platform: aliases `fable`, `opus`,
  `sonnet`, `haiku`; full ids such as `claude-opus-5-5`. Prefer aliases, which
  track the newest model in each line.
- This skill reads and displays these keys from user and project settings. It
  prints a snippet for the user's administrator instead of writing managed
  settings. Example:

  ```json
  {
    "availableModels": ["opus", "sonnet", "haiku"],
    "deniedModels": ["fable"]
  }
  ```

- The user's selected model is preserved; changing it is `/model` in the
  session, not this skill.

## Workflow size

- Key: `workflowSizeGuideline` in user or project settings. Values: `small`,
  `medium`, `large`, `unrestricted`. It is the size guideline for dynamic
  workflows (Workflow tool, `/workflows`): smaller values keep runs smaller
  and cheaper; `unrestricted` removes the guideline. Workflow concurrency stays
  capped at 16 concurrent agents per run either way.
- Related environment variable: `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` pins every
  workflow agent's model (set under `env` in settings). Leave it unset to let
  each workflow agent use its own model.
- Workflow runs pause on usage limits (since 2.1.271) regardless of this key.

## Writing a key safely

All writes go to user settings unless the user picks project settings. The
SKILL.md Step 5 block backs the file up, sets one dotted key, writes valid
JSON, and reads the value back. Never write a key the user did not pick, and
never remove other keys.
