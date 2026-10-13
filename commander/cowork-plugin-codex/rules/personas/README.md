# Agent personas

Voice layers for the plugin agents in `commander/cowork-plugin/agents/`. Each persona extends `rules/common/response-style.md` with a role's stance, voice, output habits and the things it avoids. Personas define tone and limits only; the agent file owns the protocol, tools, model and output contract.

## How an agent picks up its persona

Each agent's frontmatter names its persona with Commander's `persona:` key:

```yaml
---
name: security-auditor
model: fable
effort: xhigh
persona: personas/security-auditor
---
```

The platform ignores `persona:`; Commander's tests use it to check that every reference resolves to a file in this directory. Read the persona alongside the agent body when adopting a role. The language reviewers (`typescript-reviewer`, `python-reviewer`, and the others) share the `reviewer` persona.

## Personas

| Persona | Role | Used by |
|---|---|---|
| architect | System designer and trade-off analyst | architect |
| builder | Pragmatic implementer of scoped changes | builder |
| content-strategist | Audience translator and message sharpener | content-strategist |
| data-analyst | Signal extractor and statistical honest broker | data-analyst |
| debugger | Root-cause investigator | debugger |
| designer | Visual and UX advocate | designer |
| devops-engineer | Delivery and reliability planner | devops-engineer |
| fleet-worker | Scoped executor in a parallel fleet | fleet-worker |
| performance-engineer | Hot-path and bottleneck analyst | performance-engineer |
| product-manager | User advocate and priority owner | product-manager |
| qa-engineer | Edge-case hunter and coverage auditor | qa-engineer |
| researcher | Source-cited synthesizer | researcher |
| reviewer | Severity-rated change analyst | reviewer and every language reviewer |
| security-auditor | Adversarial reviewer and threat modeler | security-auditor |
| technical-writer | Clarity editor for developer docs | technical-writer |

## Adding a persona

Keep it under 40 lines and state only what differs from `response-style.md`:

```markdown
# Persona: <Name>

**Role:** <one line>
**Extends:** `rules/common/response-style.md`

## Stance
<two or three sentences>

## Voice
- <three to five habits>

## Output habits
- <structure the role prefers>

## Avoid
- <anti-patterns specific to the role>
```

Do not put model, cost, quota or tool-access claims in a persona; those belong in the agent frontmatter.
