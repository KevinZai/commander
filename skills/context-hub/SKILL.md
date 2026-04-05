---
name: context-hub
description: Fetch curated API documentation using the chub CLI before writing code. Use when calling external APIs (OpenAI, Stripe, Anthropic, etc.) to get accurate docs instead of hallucinating. Install chub via: npm install -g chub
---

# Context Hub — API Documentation via chub

chub is installed and ready: `which chub` (install via npm install -g chub)

## When to Use
- Before writing code that calls any external API
- When unsure about exact method signatures, params, or response shapes
- After an API call fails with unexpected results
- When a previous attempt may have hallucinated API details

## Commands
```bash
chub search                          # list all available docs
chub search "stripe payments"        # find relevant docs
chub get openai/chat --lang py       # fetch Python docs
chub get openai/chat --lang js       # fetch JS docs
chub get stripe/api                  # fetch Stripe API docs
chub get anthropic/messages          # Anthropic Messages API
chub annotate stripe/api "Needs raw body for webhook verification"  # save gotcha
chub annotate <id> --clear           # remove annotation
chub annotate --list                 # see all your annotations
chub feedback <id> up                # upvote good docs
chub feedback <id> down              # flag bad docs
```

## Workflow
1. `chub search "<api-name>"` — find the right doc ID
2. `chub get <id> --lang <py|js>` — fetch the doc
3. Read doc, write correct code
4. If you find a gap: `chub annotate <id> "<note>"` — persists for next session

## Gotchas
- Run `chub search` with no args first to see everything available — coverage grows over time
- Language flag matters: `--lang py` and `--lang js` return different variants
- Annotations persist locally across sessions — add them whenever you find gotchas
- Not all APIs are in the hub yet — fall back to web_fetch for missing ones
