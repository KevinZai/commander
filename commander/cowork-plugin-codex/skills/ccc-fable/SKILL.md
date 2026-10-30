---
name: ccc-fable
description: "Arm, check, audit or disarm the Commander Method: the PM loop, 12 checkable gates, workflow-first posture and verifier separation, persisted in Commander state. Use when the user says fable on/off/status/audit or wants verification-gated, orchestrated work."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[on | status | audit | off]"
disable-model-invocation: true
---

# $ccc-fable — arm the Commander Method

**CC Commander** · $ccc-fable · a session-wide operating contract of checkable gates, so any model produces verified, orchestrated work.

The full doctrine (12 pillars, each with rule, mechanics, gate and failure prevented) lives in [rules/fable-method.md](../../rules/fable-method.md). This skill arms it, records the armed state, reports it, and audits the session against it. The user's selected model is preserved; arming changes posture, not model.

## When to use / when not to

- Use to arm the contract before substantive work (multi-file changes, audits, migrations, research), to check whether it is armed, or to self-audit a session for gate violations.
- Use `audit` before reporting a load-bearing "done" in a long session.
- Do not use it to run a build, review or plan. It governs how those run; `$ccc-orchestrate`, `$ccc-review` and `$ccc-plan` do the work.

## What happens

### 1. Route the argument

`$ARGUMENTS` selects the action. With no argument, ask with AskUserQuestion (Codex: ask the same question in plain text):

```
question: "Commander Method — what do you want to do?"
header: "Method"
multiSelect: false
options:
  - label: "🟢 Arm it (on)"
    description: "Turns on the PM loop, 12 gates, workflow-first posture and verifier separation for this session and records it in state.json."
  - label: "Show status"
    description: "Reads state.json and reports armed or off, and since when. Changes nothing."
  - label: "Audit this session"
    description: "Checks the current session for gate violations with evidence. Changes nothing."
  - label: "Disarm (off)"
    description: "Returns to the default posture and records it in state.json. The doctrine file stays available."
```

### 2. Record the state (`on` and `off` only)

The armed flag lives under one key, `fableMethod`, in the lane's `state.json`: `<config dir>/commander/state.json`, where the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`. Until the lane has its own copy, the command reads `~/.claude/commander/state.json` and writes the merged result to the lane. The Commander HUD mod reads exactly `fableMethod.armed`. Merge that key into the file; never replace the file, because other hooks and the CLI keep their own keys there. Run with `on` or `off` as the trailing argument:

```bash
node -e 'const fs=require("fs"),path=require("path"),os=require("os");const armed=process.argv[1]==="on";if(!["on","off"].includes(process.argv[1])){console.error("usage: on|off");process.exit(2)}const dir=path.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),".claude"),"commander"),p=path.join(dir,"state.json"),legacy=path.join(os.homedir(),".claude","commander","state.json");let s={};try{s=JSON.parse(fs.readFileSync(fs.existsSync(p)?p:legacy,"utf8"))}catch(e){if(e.code!=="ENOENT"){console.error("state.json is unreadable ("+e.message+"); not overwriting it");process.exit(1)}}if(typeof s!=="object"||s===null||Array.isArray(s)){console.error("state.json is not a JSON object; not overwriting it");process.exit(1)}const before=Object.keys(s).filter(k=>k!=="fableMethod").length;s.fableMethod={armed,since:new Date().toISOString()};fs.mkdirSync(dir,{recursive:true});const tmp=p+".tmp-"+process.pid;fs.writeFileSync(tmp,JSON.stringify(s,null,2)+"\n");fs.renameSync(tmp,p);const after=Object.keys(JSON.parse(fs.readFileSync(p,"utf8"))).filter(k=>k!=="fableMethod").length;console.log(JSON.stringify({fableMethod:s.fableMethod,otherKeysPreserved:before===after}))' on
```

Expected output: `{"fableMethod":{"armed":true,"since":"<ISO>"},"otherKeysPreserved":true}`. If the command exits non-zero, report the error verbatim and do not claim the state changed; a corrupt `state.json` is the user's to repair, so never delete or reset it.

### 3a. `on` — arm the five layers

After the state write succeeds, hold these for every later turn until `$ccc-fable off` or the session ends.

**Layer 1 — the PM loop.** Every work cycle, evaluate three lenses (the same lenses `$ccc-suggest` uses):
- **SCOPE:** work ballooning past the ask, or no acceptance criteria → stop and scope. SCOPE outranks IMPROVE.
- **IMPROVE:** a manual step repeated → propose encoding it as a skill, hook or test.
- **AUDIT:** branch ahead with no review, dependencies unscanned, docs drifted from code → surface it.

Flag adjacent opportunities; never execute them inline.

**Layer 2 — the 12 gates.** Each is a question with a checkable answer. If the gate cannot be checked, the work is not done.

| # | Pillar | Gate question |
|---|---|---|
| 1 | Orchestrate, don't type | Is the plan written down with acceptance criteria before implementation started? |
| 2 | Never trust a single pass | Who verified this, and were they the one who made it? |
| 3 | Loops with gates | What is the verifier, where is the state file, and what stops this? |
| 4 | Prove it before you alarm | What is the evidence, and what would disprove it? |
| 5 | Isolation and blast-radius control | Is the main tree tracked-clean, and did the agent verify its worktree before editing? |
| 6 | Truth over cache | Is this from the source of truth, or from something that could be stale? |
| 7 | Context is disposable; state is durable | If this session died now, could a fresh one resume from durable state alone? |
| 8 | Delegation discipline | Could a competent stranger execute this brief without asking anything? |
| 9 | Lead with the outcome | Does the first sentence contain the answer? |
| 10 | Proactive PM posture | Were all three lenses evaluated, and were the flags left un-executed? |
| 11 | Effort calibration | Did a small pilot validate the approach and its cost before scaling? |
| 12 | Operationalize every fix | What prevents this class of bug from recurring, and is that prevention mechanical? |

**Layer 3 — proactive prompts.** Raise these from the trigger, without waiting for the user to remember:

| Trigger observed | Prompt to raise |
|---|---|
| Multi-file, audit or migration task | "This is workflow-scale: plan file, executor agents, adversarial verify, not a single pass." |
| Feature request with no acceptance criteria | "Scope first: what does done look like, and what does broken look like?" |
| Branch ahead of main, no review run | "Unverified work is accumulating: run an independent review pass." |
| Same fix or check performed twice | "Second occurrence: encode it as a skill, hook or test now." |
| Recurring task with an automated verifier | "This passes the loop gate: hand it to `/loop`, `/schedule` or `/goal` via `$ccc-loop`." |
| A loop running without a state file | "Add `.claude/loop-state/<name>.json` before the next tick." |
| A severe finding about to be reported | "Prove it: exact check, real samples, one honest attempt to disprove, then calibrate severity." |
| Context at or above ~70% | "Write the handoff now with `$ccc-handoff`: state, decisions, what not to retry, next step." |
| A subagent reported success | "Re-run the load-bearing check before reporting done." |
| The user pushes back on a recommendation | "Steel-man their view; change position on new evidence, not on pressure." |
| About to delete or overwrite anything | "Archive, don't delete. Resolve symlinks first. If you did not create it, ask." |
| Session ending | "Dense reloadable summary: worked (evidence), failed (why), untried, exact next step." |

**Layer 4 — workflow-first posture.** The lead session is a control plane: decisions, delegations, verified conclusions. Route substantive work (multi-file, multi-step, research, audit, migration) through the Workflow tool or Agent-tool subagents with `isolation: worktree` for code writers; keep only trivial single-file work inline. Mechanics: [rules/workflow-first.md](../../rules/workflow-first.md). Codex: use `codex exec` or `codex cloud exec` for delegated lanes.

**Layer 5 — verifier separation.** The maker of a finding, fix or claim never grades it. A subagent's self-report is a claim. Before reporting done, re-run the load-bearing check, or dispatch a fresh-context verifier through the Agent tool that is prompted to refute.

Confirm in one line: "Commander Method armed: 12 gates · PM loop · workflow-first posture · verifier separation. `$ccc-fable audit` to self-check."

### 3b. `status` — read, never write

```bash
node -e 'const fs=require("fs"),path=require("path"),os=require("os");const lane=path.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),".claude"),"commander","state.json"),p=fs.existsSync(lane)?lane:path.join(os.homedir(),".claude","commander","state.json");let s;try{s=JSON.parse(fs.readFileSync(p,"utf8"))}catch(e){console.log(e.code==="ENOENT"?"no state.json: never armed":"state.json unreadable: "+e.message);process.exit(0)}const f=s&&s.fableMethod;console.log(f&&typeof f==="object"?JSON.stringify(f):"fableMethod not set: never armed")'
```

Report one of: armed since `<since>` (with the elapsed time), off since `<since>`, or never armed. If the file says armed but nothing this session applied the layers, say both facts plainly: the stored flag persists across sessions, the posture has to be re-applied in each new session with `$ccc-fable on`.

### 3c. `audit` — find violations with evidence

Check the current session against these pillars. Each item is a concrete observation, not an impression:

1. **Orchestrate:** a multi-file task in flight with no written plan or acceptance criteria?
2. **Verify:** a "done" or "fixed" claim in recent turns that nobody independently re-checked?
3. **Loops:** a loop or repeated retry running without a `.claude/loop-state/<name>.json` file?
4. **Prove:** a finding with a count or severity label but no method line (the exact command or check)?
5. **Isolation:** a code-writing subagent editing through the main checkout instead of an isolated worktree? Check with `git -C <path> rev-parse --show-toplevel` and `git worktree list`.
6. **Truth:** a state-changing decision resting on a cache or log instead of the authoritative source?
7. **Durable state:** context above ~70% with no handoff written?
8. **Delegation:** a dispatched brief missing scope, file ownership or report format?
9. **Operationalize:** a bug fixed this session with no sibling sweep and no mechanical guard?

Report as a table: `Pillar | Violation observed | Evidence | Suggested fix`. If nothing is found, say so. Inventing violations to look thorough would itself break pillar 4.

### 3d. `off` — disarm

After the state write succeeds with `off`, drop the five layers and confirm: "Commander Method disarmed: back to the default posture. Doctrine stays at `rules/fable-method.md`."

## Done when

- `on` / `off`: the step 2 command printed `"armed":true` or `"armed":false` with `"otherKeysPreserved":true`, and the confirmation line names the action. Report the actual JSON line.
- `status`: the step 3b command ran and its output is what you reported.
- `audit`: every row cites evidence from this session (a turn, a command output, a path), or the report says no violations were found.

## Guardrails

- Never overwrite, reset or delete `state.json` (the lane's or `~/.claude/commander/state.json`); merge only the `fableMethod` key, and stop on a parse error.
- Never write state on `status` or `audit`.
- Never switch the user's model or effort as part of arming; suggest `/model fable` only when the user asks for deep reasoning.
- Never execute PM-loop flags inline; raise them and let the user choose.
- Never claim a gate passed without the check that proves it.

## See also

- `$ccc-orchestrate` — pillar 1: goal file, executor, verify.
- `$ccc-suggest` — pillar 10: the IMPROVE / SCOPE / AUDIT loop as a standing advisor.
- `$ccc-loop` — pillar 3: loop gate, verifier and state file.
- `$ccc-handoff` — pillar 7: durable state before context degrades.

Related rules: [rules/fable-method.md](../../rules/fable-method.md), [rules/workflow-first.md](../../rules/workflow-first.md), [rules/common/reasoning-hygiene.md](../../rules/common/reasoning-hygiene.md).

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
