---
name: ccc-pr-comments
description: "Format agent-authored GitHub comments with a model attribution note and a direct style. Use when posting any GitHub comment on the user's behalf: PR comments, inline review comments, replies to bots, or a dismissal reason."
allowed-tools:
  - Read
  - Bash(gh pr view *)
argument-hint: "[comment text]"
disable-model-invocation: true
---

# $ccc-pr-comments — Attributed GitHub comments

**CC Commander** · $ccc-pr-comments · every comment posted for the user carries a clear attribution note and a direct reply.

> Adapted from [t3dotgg/tstack](https://github.com/t3dotgg/tstack) `skills/leaving-pr-comments/SKILL.md` at `92e38e2cf677a84a142e8df296861c588542135c`. MIT, Copyright (c) 2026 Theo Browne; see `LICENSE.txt`. Changes for CC Commander are marked "CCC safety:".

This skill is a format reference. Other PR skills read it; it is not auto-invoked. Codex: ask any question below as a plain-text question.

## When to use / when not to

- Use for top-level PR comments, inline review comments, replies to bots or reviewers, and written explanations posted before resolving or dismissing feedback.
- Not for PR descriptions, commit messages, or text the user explicitly asked to post verbatim without attribution.

## What happens

1. Prefix the comment with this GitHub note callout:

   ```md
   > [!NOTE]
   > 🤖 **<model> responding on behalf of <user>**

   Actual comment starts here.
   ```

   Use the verified public name of the model that wrote the comment and the user's name or GitHub login. If the harness does not expose a model name, use the harness name; do not guess.
2. Keep the attribution inside the note and the actual reply outside it. The context line starts with the robot emoji. Add no horizontal rule, Setext underline, heading, signature footer, or second attribution.
3. Write the comment directly: lead with the conclusion, cite the relevant code, behavior, check, or reproduction, stay concise (no filler, canned thanks, or status narration), and distinguish verified facts from judgment.
4. Check the entire comment, including quoted text and attachments, for secrets and private details.
5. Show the final Markdown to the user so quoting and blank lines render as intended.
6. After posting, confirm GitHub returned the comment or review URL. Resolve a review thread only after its response posted successfully.

## Decision points

Before posting (AskUserQuestion, 2–3 options; Codex: request_user_input or a plain-text question):
- 🟢 Post as previewed: posts the comment now
- Edit first: revise the text, then preview again
- Do not post: nothing is sent

CCC safety: posting is an external write, so each post needs the user's approval in this conversation unless the user already asked for this specific comment.

## Done when

- The preview matched the posted text and the returned comment or review URL is reported.

## Guardrails

- Never post without authorization in the current conversation.
- Never include secrets, tokens, or private details.
- Never add the note to a PR description or commit message.

## See also

- `$ccc-review` — branch review
- `$ccc-ci` — CI failure diagnosis

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
