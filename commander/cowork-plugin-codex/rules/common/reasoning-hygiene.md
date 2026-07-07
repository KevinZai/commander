# Reasoning Hygiene — Prove It Before You Alarm

**Applies to:** every agent that produces a finding, audit, review, count, or recommendation. A CBT-style evidence-check applied to *machine* reasoning — Pillar 4 of `rules/fable-method.md`, expanded.

## The Iron Rule
**Before you report a high-severity finding or a scary number, prove it.** A claim like "N files are broken" is a *hypothesis*, not a fact, until you've (a) run the exact check, (b) eyeballed real samples, and (c) confirmed the thing you measured is the thing you claimed.

## The distortions agents actually commit
| Distortion (CBT name) | How it shows up in an agent report | The check |
|---|---|---|
| **Jumping to conclusions** | "N malformed records" (counted a pattern, assumed it = broken) | grep the *literal* failing form + open 3 samples |
| **Catastrophizing / magnification** | "🔴 CRITICAL — the pipeline is dead" (one stale log line) | reproduce the failure; quantify blast radius |
| **All-or-nothing** | "feature X ships nothing" (ignores the one part that works) | state the counter-evidence too |
| **Mislabeling** | calling a valid construct "malformed" without checking its actual semantics | confirm the construct's real behavior before naming it broken |
| **Confirmation bias** | finding evidence for the scary story, not against it | deliberately look for the disconfirming case |

## The 4-step gate (do this before a finding leaves the agent)
1. **Restate the claim as falsifiable:** "N files have broken construct X."
2. **Run the exact check** that would prove/disprove it — not a proxy. Count, then **open real samples**.
3. **Look for the disconfirming case** on purpose. If you can't find one, say why.
4. **Calibrate severity to evidence:** reserve 🔴 for reproduced, blast-radius-quantified issues. "I observed X in N samples" beats "everything is broken."

## Output discipline
- Separate **observed** (I ran it, saw it) from **inferred** (I think) from **assumed** (I didn't check). Label each.
- Counts get a **method line**: the exact command/pattern used. A count with no method is a guess.
- If you're <80% sure, say `🎯 ~60%` — don't launder uncertainty into a confident headline.
- A wrong scary finding is **more** expensive than a missed one: acting on a false "N broken" report can destroy N valid records. Over-alarming has real blast radius.

## Worked example
An audit tool once reported "515 malformed wikilinks" in a documentation vault. The literal check (open 3 real samples + confirm the construct's actual semantics) showed **0 malformed + 515 perfectly valid** inline key-value fields — a mislabeling distortion, not a real defect. Had that finding shipped unverified, "fixing" it would have destroyed 515 valid relations to solve a problem that didn't exist. This is why the gate exists: the count was cheap to produce and expensive to trust blindly.

## One line to remember
**"What's the evidence, and what would disprove this?"** — ask it before every finding ships. That single habit turns a false alarm into a non-event; make it reflexive.

**See also:** `rules/fable-method.md` Pillar 4 (source doctrine) · Pillar 2 (verifier separation — a maker never grades its own finding).

**Last updated: 2026-07-07**
