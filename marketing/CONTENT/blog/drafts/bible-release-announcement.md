---
title: "Kevin Z's Claude Code Bible, full release"
status: DRAFT - not published
author: Kevin Z
date: TBD
---

## EDITOR NOTES

Internal review copy. Publication requires a separate decision. This draft does not announce a new software version.

| Claim / detail | Evidence and required verification before publishing |
| --- | --- |
| Title, byline, and "full release" / "ready to read" wording | Kevin must approve the byline and confirm that the linked edition is the intended full release. Set the publication date only after approval; `TBD` is intentional. |
| The Bible page and Markdown source are available to readers | [The repository's Bible mirror](../../../../mintlify-docs/bible.mdx) identifies `https://commanderplugin.com/bible.html` as canonical and links the GitHub source. **UNVERIFIED LIVE:** the web tool could not retrieve the canonical page during drafting. Open both reader links and confirm the intended edition is accessible before publishing. |
| The guide covers project setup, feature work, debugging, and release preparation | Source-supported by the chapter headings in [BIBLE.md](../../../../BIBLE.md). Recheck those sections against the edition readers will see. |
| The Golden Rules emphasize planning, verification, and simple solutions | Source-supported by BIBLE.md, "Golden Rules." Check the live section before retaining this summary. |
| The guide includes handoff, bug-fix, and code-review prompt templates | Source-supported by BIBLE.md, "Prompt Templates." Confirm that the linked edition includes those templates. |
| Personal framing: the guide is the reference Kevin wants beside a project | Proposed author voice, not a recorded testimonial. Kevin must approve it. |
| Release version and skill / agent totals | No version or inventory count is asserted in the article. If added, read [package.json](../../../../package.json), reconcile [commander/contract.json](../../../../commander/contract.json) with the [plugin skill sources](../../../../commander/cowork-plugin/skills/) and [agent sources](../../../../commander/cowork-plugin/agents/), and date the verification. Do not copy counts from older marketing pages. |

Editorial scope: no Cursor claims, pricing promises, benchmark results, or new release date. Confirm the blog surface separately; leave the founder-story post in PR #180 untouched.

## DRAFT

# Kevin Z's Claude Code Bible, full release

The full Claude Code Bible is ready to read. It brings project setup, feature work, debugging, and release preparation into one guide.

It's the reference I want beside a project when I need to decide what to do next.

Start with the Golden Rules. Plan before coding. Check the result before calling it done. Keep the solution simple enough to understand. Those are useful habits whether you're starting a project or returning to a stubborn bug.

Then jump to the chapter that matches the work in front of you. Read the feature-building section before a new feature, or the debugging section when something breaks. Use the guide as a working reference; there's no need to finish it before getting started.

The prompt templates give you another entry point: a handoff for the next session, a bug-fix brief, or a code-review request. Pick one, adapt it to your project, and check what the agent actually produces.

[Read Kevin Z's Claude Code Bible](https://commanderplugin.com/bible.html).

Prefer Markdown? [Read the source on GitHub](https://github.com/KevinZai/commander/blob/main/BIBLE.md).
