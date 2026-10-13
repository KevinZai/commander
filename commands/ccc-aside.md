---
description: "Answer a quick side question mid-task without editing files or losing the current task, then resume where work paused. Use when you want a fast explanation or second opinion without derailing the work."
---

# /ccc-aside — side question, then resume

**CC Commander** · /ccc-aside · a focused answer to one question, then the paused task continues from the same point.

## Usage

```
/ccc-aside <question>
/ccc-aside what does this function actually return?
/ccc-aside is this pattern thread-safe?
/ccc-aside should we worry about the N+1 query we just added?
```

The question is `$ARGUMENTS`.

## What happens

1. **Hold the task state.** Note the active task (file, feature or problem), the step in progress, and the next planned step. Do not create, edit or delete any file during the aside.
2. **Answer directly.** Lead with the answer, keep it short, and cite `path:line` when the question is about code. If answering needs a file, read it (read-only).
3. **Use this shape:**

   ```
   ASIDE: <question, restated briefly>

   <answer>

   — Back to task: <one line naming the paused work>
   ```

4. **Resume.** Continue the paused task from the exact step it stopped at, without asking permission, unless a case below says to wait.

## Cases

| Situation | Do this |
|---|---|
| No question given | Reply `ASIDE: no question provided`, ask what they want to know, and end with the back-to-task line. |
| No active task | Use the same shape and end with `— Back to task: no active task to resume`. |
| Answer exposes a problem with the current approach | Add `⚠️ Note: this suggests <issue> with the current approach.` and ask (below) before resuming. |
| The "question" is really a direction change (for example `/ccc-aside actually, let's use Redis instead`) | Ask (below); do not assume. |
| Answer implies a code change | Add `📝 Worth fixing: <change>. I'll raise it after the current task.` Do not make the change during the aside. |
| A full answer would be long | Give the essential answer and offer a deeper explanation after the current task. |
| Several asides in a row | Answer each in order, then resume once, with the task state intact. |
| Question is ambiguous | Ask one short clarifying question, no more. |

## Decision points

When the answer exposes a problem, ask with AskUserQuestion (plain-text question where unavailable):
- 🟢 Address it now — pause the task and deal with the issue first.
- Continue as planned — resume and raise it in the final summary.

When the aside is a direction change:
- 🟢 Information only — answer and keep the current plan.
- Change approach — pause the current task and replan around the new direction.

## Example

```
/ccc-aside what does fetchWithRetry() actually do?

ASIDE: what does fetchWithRetry() do?

fetchWithRetry() (src/api/retry.ts:12) tries the request up to 3 times with
exponential backoff (250ms, 500ms, 1s). It retries only on 5xx responses and
network errors; 4xx responses are final.

— Back to task: refactoring the auth middleware in src/middleware/auth.ts
```

## Done when

The answer is delivered in the shape above and the paused task has either resumed or is waiting on the user's picker choice.

## Guardrails

- Read-only: no file writes, commands with side effects, or tracker updates during an aside.
- The aside is a pause, not a new task; the original task always resumes unless the user chose to change it.
- Do not save the aside to session files unless it changes the task outcome.

## See also

`/ccc-debug-session` · `/ccc-sessions` · `/ccc-status`
