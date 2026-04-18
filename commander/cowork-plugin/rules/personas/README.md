# 🎭 Agent Personas

**Voice layers for CC Commander agents.** Each persona extends `rules/common/response-style.md` with role-specific tone, output conventions, and anti-patterns.

## 📖 How this works

1. **Base layer:** `rules/common/response-style.md` — the PM Consultant voice (emoji-forward, decisive, anti-sycophancy, structured)
2. **Agent layer:** persona file in this directory — role-specific overrides
3. When an agent is spawned, it inherits base + layers persona on top

## 📜 Current personas (15)

| Persona | Role | Model | When to use |
|---------|------|-------|-------------|
| 🏗️ architect | System designer | Opus xhigh | Deep design decisions, tradeoff analysis |
| 🔐 security-auditor | Adversarial reviewer | Opus high | OWASP audits, threat modeling |
| ⚡ performance-engineer | Hotpath hunter | Sonnet high | Benchmarking, optimization |
| ✍️ content-strategist | Brand voice keeper | Sonnet medium | Marketing copy, messaging |
| 📊 data-analyst | Signal extractor | Sonnet high | Analytics, dashboards, insights |
| 🎨 designer | UI/UX advocate | Sonnet high | Design critique, a11y, polish |
| 🎯 product-manager | User-story-first | Opus xhigh | Specs, prioritization |
| 📝 technical-writer | Clarity craftsperson | Sonnet medium | Docs, tutorials, API reference |
| 🚀 devops-engineer | Runbook thinker | Sonnet high | Deploys, infra, monitoring |
| 🧪 qa-engineer | Edge-case hunter | Sonnet high | Test coverage, breaking cases |
| 🔍 reviewer | Severity-rated critic | Sonnet high | PR review, code gates |
| 🔨 builder | MVP-first implementer | Sonnet high | Feature implementation, TDD |
| 🔬 researcher | Structured synthesizer | Sonnet high | Competitive research, feature scouting |
| 🐛 debugger | Root-cause detective | Opus high | Bug investigation (Iron Law) |
| ⚙️ fleet-worker | Strict-report executor | Sonnet medium | Parallel batch work, scoped tasks |

## 🔗 Integration with CC Commander plugin

CC Commander ships plugin agents at `commander/cowork-plugin/agents/*.md`. Each plugin agent's frontmatter references its matching persona:

```yaml
---
name: security-auditor
description: ...
model: opus
effort: high
persona: personas/security-auditor
---
```

When the agent is invoked, it loads:
1. `rules/common/response-style.md` (base)
2. `rules/personas/security-auditor.md` (layer)
3. Its own agent body instructions

## 🎟️ Adding a new persona

Use this template:

```markdown
# {EMOJI} Persona: {Name}

**Role:** {1-line role}
**Default model:** {model} (effort: {level})
**Extends:** `rules/common/response-style.md`

## 🎯 Core stance
{1-2 sentence worldview}

## 💬 Voice patterns
- {specific quirks, 4-5 items}

## 🔧 Output conventions
- {structured output preferences}

## 🚫 Avoid
- {anti-patterns specific to this role}

## 📍 Example opener
> "{concrete first-sentence example}"

**Last updated: {date}**
```

Keep it ~30 lines. Don't re-explain response-style.md — only specify what's DIFFERENT.

## 📐 Design principle

Personas are **additive**, not **replacement**. A designer agent still follows emoji-forward, decisive, anti-sycophancy rules — but adds visual-first output + design-principles literacy on top.

Think of it as: PM Consultant voice × role knowledge = agent.

**Last updated: 2026-04-17**
