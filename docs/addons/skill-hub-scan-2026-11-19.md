# Skill-hub scan (2026-11-19)

Kevin's X post on 2026-11-19 named nine hubs in the Claude skills ecosystem. This file records the verdict on each, so nothing is dropped silently. Licenses and contents were checked on 2026-11-19 during planning; the two sources acted on (jezweb/claude-skills and Skill_Seekers) were re-read from clones at the pinned commits below.

## Verdicts

| Hub | License | Verdict |
|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) (Anthropic official) | Mixed per-skill licenses (Apache-2.0 for some, Anthropic proprietary terms for the document skills), no root LICENSE | Already covered: the Apache-2.0 derivations Commander ships are in NOTICE.md and `docs/UPSTREAMS.md`; nothing new taken, as refused on 2026-11-18 (`docs/addons/x-scan-2026-11-18.md`). |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | MIT | Already vendored as `vendor/claude-skills` at v2.14.14; pin refreshes belong to the upstream sync. |
| [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | No license | Skip: a link list with no license, nothing to copy. |
| [BehiSecc/awesome-claude-skills](https://github.com/BehiSecc/awesome-claude-skills) | No license | Skip: a link list with no license, nothing to copy. |
| [jezweb/claude-skills](https://github.com/jezweb/claude-skills) | MIT | Taken: four workflow skills (Google Apps Script, favicon generator, SVG icon sets, ElevenLabs voice agents) as `skills/jezweb-pack/`, pinned at `1260fa7439b36b18dbf16648ccc7fb44783f6c23`. Five others skipped for overlap or unsafe setup steps; see `skills/jezweb-pack/DECISIONS.md`. |
| [yusufkaraaslan/Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) | MIT | Opt-in mention only: `/ccc-suggest` names it as an authoring tool that turns docs sites, repositories and PDFs into skills, with its upstream README reviewed at `15a67e3c1e7ceb6c63b88f9f3fe480d7b547fe22`. No code copied. |
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | MIT (the list itself) | Not taken now: a cross-agent link list whose linked skills carry their own licenses. A later scan could cherry-pick, checking each skill's license on its own. |
| [majiayu000/claude-skill-registry](https://github.com/majiayu000/claude-skill-registry) | MIT | Skip: a catalog of other people's skills; `/ccc-browse` already covers browsing Commander's catalog. |
| aradotso/trending-skills | Unknown | Skip: an auto-generated trending mirror of other repositories, and not found through GitHub search during planning. |

## What changed in Commander

- `skills/jezweb-pack/` (router, DECISIONS.md, licenses), opt-in, routed from `skills/ccc-design` for favicon and icon-set requests.
- `/ccc-suggest` third-party list: one Authoring row for `skill-seekers` beside `book-to-skill`.
- NOTICE.md, `docs/UPSTREAMS.md` and CHANGELOG.md record the pack.
