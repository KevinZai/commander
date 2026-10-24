---
name: ccc-knowledge
description: "Search, browse and add lessons in the local CC Commander knowledge base: recent lessons, topic search, category view, stats and file-edit captures. Use when the user asks what we learned, wants past lessons, the knowledge base, or types $ccc-knowledge."
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[search <topic> | recent | stats | category <name> | add]"
model: haiku
effort: low
---

# $ccc-knowledge — search what we learned

**CC Commander** · $ccc-knowledge · past lessons from `<config dir>/commander/knowledge/` (`~/.claude/commander/knowledge/` by default; the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`), searchable in one step.

> Placeholders like ~~knowledge base refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

## When to use / when not to

- Use to recall lessons before a similar task, review outcomes by category, or record a lesson by hand.
- Use `$ccc-recall` to search past session transcripts, and `$ccc-memory` for project memory in `CLAUDE.md` and `memory/`. This skill reads only the Commander knowledge directory.

## What the directory holds

| File | Written by | Used here |
|---|---|---|
| `kl-<epoch-ms>.json` | the CC Commander CLI (`commander/knowledge.js`) after a dispatched task, or "Add a lesson" below | lessons: `timestamp`, `task`, `outcome`, `category`, `keywords`, `patterns.{techStack, successPatterns, errorPatterns}` |
| `session-*.json` | the plugin SessionEnd hook | session stubs (`sessionId`, `startedAt`, `endedAt`); counted, not shown as lessons |
| `auto-captures.jsonl` | the knowledge-capture PostToolUse hook | one line per Write/Edit (`timestamp`, `tool`, `file`); counted in stats |

The directory can hold thousands of files, so never glob it with `ls *.json` (the shell fails with "argument list too long"). Every read goes through the query command in step 1.

## What happens

### 1. Run the query command

All modes use this one command. Replace `MODE` with `recent`, `search`, `category` or `stats`, and `ARG` with the count, topic or category name (quote topics).

```bash
node -e '
const fs=require("fs"),path=require("path"),os=require("os");
const dir=path.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),".claude"),"commander","knowledge");
const [mode="recent",arg=""]=process.argv.slice(1);
let names=[];try{names=fs.readdirSync(dir)}catch{console.log("EMPTY dir-missing");process.exit(0)}
const L=[];for(const f of names){if(!f.endsWith(".json")||f.startsWith("session-"))continue;
  try{const l=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));if(l&&l.timestamp)L.push(Object.assign({file:f},l))}catch{}}
L.sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));
const sessions=names.filter(f=>f.startsWith("session-")).length;
let captures=0;try{captures=fs.readFileSync(path.join(dir,"auto-captures.jsonl"),"utf8").split("\n").filter(Boolean).length}catch{}
if(mode==="stats"){const by=k=>L.reduce((m,l)=>{const v=l[k]||"unknown";m[v]=(m[v]||0)+1;return m},{});
  console.log(JSON.stringify({lessons:L.length,outcome:by("outcome"),category:by("category"),sessions,captures}));process.exit(0)}
if(!L.length){console.log("EMPTY lessons=0 sessions="+sessions+" captures="+captures);process.exit(0)}
const q=String(arg).toLowerCase();
const hits=mode==="search"?L.filter(l=>JSON.stringify(l).toLowerCase().includes(q))
  :mode==="category"?L.filter(l=>(l.category||"general")===q):L;
const n=mode==="recent"?(Number(arg)||3):10;
const p=l=>l.patterns||{};
for(const l of hits.slice(0,n))console.log(JSON.stringify({date:String(l.timestamp).slice(0,10),category:l.category||"general",
  outcome:l.outcome||"unknown",task:String(l.task||l.description||"").slice(0,120),worked:p(l).successPatterns||[],
  failed:p(l).errorPatterns||[],stack:p(l).techStack||[],file:l.file}));
if(!hits.length)console.log("NO-MATCH "+mode+" "+q);
' MODE ARG
```

Output handling:

- `EMPTY …` → say "No lessons recorded yet. The CC Commander CLI stores one after each dispatched task; add one here with **Add a lesson**." Include the session and capture counts from the line, then show the Quick-mode picker.
- `NO-MATCH …` → say nothing matched and offer a broader term or **View stats** to browse categories.
- JSON lines → render as below. Never invent a lesson the command did not print.

### 2. Pick the mode from the argument

| Argument | Run | Render |
|---|---|---|
| none | `recent 3` | Quick mode (step 3) |
| `recent` | `recent 10` | one line per lesson |
| `search <topic>`, or any other text | `search "<topic>"` | full card per lesson |
| `category <name>` | `category <name>` | one line per lesson, newest first |
| `stats` | `stats` | stats block |
| `add` | none | step 5 |

One-line form: `[2026-03-15] web | success — Build dashboard with auth` (task trimmed to 60 characters).

Full card form:

```
[2026-03-15] web | success
Task:   Build dashboard with auth
Worked: <successPatterns joined, or n/a>
Failed: <errorPatterns joined, or n/a>
Stack:  <techStack joined, or n/a>
```

Stats block (percentages computed from the JSON; omit outcomes with zero):

```
📊 Knowledge base
Lessons:        <lessons>   success <n> (<pct>%) · error <n> · other <n>
Top categories: <three largest, "name count">
Session stubs:  <sessions>  ·  file-edit captures: <captures>
```

### 3. Quick mode (no argument)

Run `recent 3`, render one line per lesson, then ask with the Quick-mode picker. For **Search by topic**, ask for the topic in plain text, then run `search`. After **View stats**, ask with the category picker built from the three largest categories and run `category` on the choice.

### 4. Optional connectors

Only when a connector in that category is exposed in this session (all are opt-in and absent by default):

- ~~knowledge base (Notion, Confluence): pull related docs into the answer; push lessons only after the sync picker.
- ~~files (Google Drive): read runbooks or retrospectives; upload lessons only after the sync picker.
- ~~project tracker: when a lesson's `task` names an issue key, link to it; search by issue key with `search "<KEY-123>"`.

Reads need no extra approval. Every push, upload or tracker write asks with the sync picker at that moment.

### 5. Add a lesson

1. Ask in plain text for the task and what worked or failed, unless the conversation already states them.
2. Ask the outcome with the outcome picker.
3. Set `category` with the CLI's rules, first match wins: website/landing/frontend/react/next/html/css/ui/ux → `web`; api/backend/server/rest/graphql/endpoint/database → `api`; cli/script/tool/automation/bash → `cli`; blog/article/content/writing/post/copy → `content`; social/twitter/linkedin/instagram/thread → `social`; email/campaign/newsletter/sequence → `email`; research/analysis/competitive/market/audit/seo → `research`; test/testing/e2e/unit/integration/qa → `testing`; deploy/ci/cd/docker/aws/infrastructure → `devops`; fix/bug/debug/error/issue/broken → `bugfix`; otherwise `general`.
4. Get the id and timestamp with `node -e 'console.log("kl-"+Date.now(), new Date().toISOString())'`, then Write `<config dir>/commander/knowledge/<id>.json` (create the directory with `mkdir -p` first if step 1 printed `dir-missing`):

```json
{
  "id": "kl-1760000000000",
  "timestamp": "2026-10-13T14:22:00.000Z",
  "task": "Build dashboard with auth",
  "outcome": "success",
  "category": "web",
  "keywords": ["dashboard", "auth"],
  "source": "manual",
  "patterns": { "techStack": ["next", "prisma"], "successPatterns": ["server actions for mutations"], "errorPatterns": [] }
}
```

5. Verify with `search "<id>"` (step 1) and show the printed card.

## Decision points

Quick mode:

```
question: "What next?"
header: "Knowledge"
multiSelect: false
options:
  - label: "🟢 Search by topic"
    description: "Type a keyword; matching lessons show as full cards."
  - label: "Show 10 recent"
    description: "One line per lesson, newest first."
  - label: "📊 View stats"
    description: "Totals by outcome and category, then browse a category."
  - label: "📝 Add a lesson"
    description: "Record what worked or failed so the next similar task starts from it."
```

Category (after stats): the three largest categories as options, 🟢 on the largest, plus "🔄 Search instead". The built-in "Other" answer accepts any category name.

Outcome (add): 🟢 success · error · cancelled.

Sync (before any connector write): 🟢 "Keep local only" · "Sync these lessons to <connector>", with the destination named in the description.

## Done when

- Every lesson shown came from a query-command run in this turn, and the reply states the mode and match count.
- For **Add a lesson**, the `search "<id>"` check printed the new card; if it did not, report the write failure instead of claiming it was saved.
- For a connector sync, the connector's own response confirmed the write.

## Guardrails

- Read only `<config dir>/commander/knowledge/`. Never print `auto-captures.jsonl` lines wholesale, since they hold local file paths; report counts.
- Write only new `kl-*.json` files; never edit or delete existing lessons, session stubs or captures.
- Never push to a knowledge base, drive or tracker without the sync picker's approval in this conversation.
- Codex: ask each picker as a plain-text question with the same options.

## See also

- `$ccc-recall` — search past session transcripts
- `$ccc-memory` — project memory in `CLAUDE.md` and `memory/`
- `$ccc-learn` — browse skill domains
- `$ccc-handoff` — save session state before compaction

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
