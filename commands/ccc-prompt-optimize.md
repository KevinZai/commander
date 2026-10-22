---
description: "Analyze a draft prompt and return an optimized, copy-ready version with the matching skills, commands, agents and model tier. Advisory only: never executes the task. Use when the user wants a prompt improved before running it."
---

# /ccc-prompt-optimize — sharpen a prompt before running it

**CC Commander** · /ccc-prompt-optimize · a diagnosis, the components to use, and a Full and Quick version of the prompt, ready to paste into a new session.

## Input

`$ARGUMENTS` is the draft prompt. If it is empty, ask the user for the prompt in plain text and stop until they provide it.

## What happens

1. **Load the method.** If the vendored `prompt-optimizer` skill is available (`vendor/everything-claude-code/skills/prompt-optimizer/SKILL.md` in a repo checkout), read it and use its Output Format. Otherwise follow the pipeline below as written.
2. **Project detection.** Read the project `CLAUDE.md` when present and detect the stack from manifest files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, and similar). Use the file count from `git ls-files | wc -l` as the codebase-size signal.
3. **Intent.** Classify the task: new feature, bug fix, refactor, research, testing, review, documentation, infrastructure, or design.
4. **Scope.** Rate it TRIVIAL, LOW, MEDIUM, HIGH or EPIC, using codebase size as one signal.
5. **Component matching.** Map the task to the skills, commands and agents that exist in this install (check `commands/`, the plugin `skills/` and `agents/` directories rather than recalling names). Name skills as skills ("use the blueprint skill"), never as slash commands; only real commands get a `/` prefix.
6. **Missing context.** List the gaps (acceptance criteria, target files, constraints, environment). When three or more critical items are missing, ask the user to fill them before generating, in plain text, and stop.
7. **Workflow and model.** Place the task in the lifecycle (plan, build, verify, ship). Recommend a tier by alias only where it changes the outcome: `fable` for architecture, migrations and threat models; `opus` for implementation and review; `sonnet` for bounded edits and docs; `haiku` for classification and extraction. State that the user's selected model stays in effect unless they choose otherwise. Split HIGH and EPIC work into a sequence of prompts.

## Output

Respond in the language of the user's input, in this order:

1. **Diagnosis** — intent, scope, stack, and the missing context found.
2. **Recommended components** — skills, commands, agents and model tier, each with one line on why.
3. **Full version** — the detailed optimized prompt, complete enough to paste into a fresh session without this conversation.
4. **Quick version** — a compact variant shaped for the intent type.
5. **Next step** — one line: adjust the prompt, or start a separate task request with the chosen version.

## Done when

Both versions are complete and self-contained, and every component named was confirmed to exist in this install.

## Guardrails

- Do not execute the user's task, edit files or run state-changing commands. If the user asks for execution, say that this command only produces advisory output and that they should start a normal task request with the optimized prompt.
- Do not name a model id, command or skill that is not present in this install.

## See also

`/ccc-prompt-fix` · `/ccc-plan` · `/ccc-model-route`
