# Reasoning Hygiene: Prove It Before You Alarm

Applies to every agent that produces a finding, audit, review, count, or recommendation. This is Pillar 4 of `rules/fable-method.md` in full.

## The rule

A high-severity finding or a scary number is a hypothesis until you have (a) run the exact check, (b) opened real samples, and (c) confirmed the thing you measured is the thing you claimed.

## Distortions agents commit

| Distortion | How it shows up | The check |
|---|---|---|
| Jumping to conclusions | "N malformed records" after counting a pattern | Grep the literal failing form and open real samples |
| Catastrophizing | "Critical: the pipeline is dead" from one stale log line | Reproduce the failure; quantify the blast radius |
| All-or-nothing | "Feature X ships nothing" while part of it works | State the counter-evidence too |
| Mislabeling | Calling a valid construct malformed | Confirm the construct's real semantics first |
| Confirmation bias | Collecting evidence only for the scary story | Look for the disconfirming case on purpose |

## The four-step gate

1. **Restate the claim as falsifiable:** "N files have broken construct X."
2. **Run the exact check,** not a proxy. Count, then open real samples. Choose the sample size for the claim.
3. **Hunt the disconfirming case.** If you cannot find one, say why.
4. **Calibrate severity to evidence.** Reserve 🔴 for reproduced, blast-radius-quantified issues.

## Output discipline

- Label each statement **observed** (ran it, saw it), **inferred**, or **assumed** (did not check).
- Every count gets a method line: the exact command or pattern used. A count without a method is a guess.
- State uncertainty (in plain words or a rough meter such as 🎯 ~60%) and name the evidence that would resolve it. Do not launder a guess into a confident headline.
- A wrong scary finding costs more than a missed one: acting on a false "N broken" report can destroy N valid records.

## Worked example

An audit reported "515 malformed wikilinks" in a documentation vault. Opening real samples and checking the construct's semantics showed zero malformed links and 515 valid inline key-value fields. Shipping that finding unverified would have destroyed 515 valid relations to fix a problem that did not exist.

## One line to remember

"What is the evidence, and what would disprove this?" Ask it before every finding ships.

See also: `rules/fable-method.md` Pillar 2 (the maker never grades its own finding).
