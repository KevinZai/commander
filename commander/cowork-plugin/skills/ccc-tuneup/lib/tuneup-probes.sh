#!/usr/bin/env bash
# tuneup-probes.sh — side-effect-free live probes for /ccc-tuneup
#
# Usage: bash tuneup-probes.sh [CLONE_ROOT]
#
# Emits KEY=VALUE lines. Every field uses `2>/dev/null || echo n/a` — never crashes.
# NO python3. Pure jq + bash + node -e only.
# Produces NO side-effects (no writes, no network, no restarts).
#
# Sections:
#   SECTION:CLONE      — clone resolution
#   SECTION:JUNK       — junk sweep candidates
#   SECTION:COUNTS     — live skill/agent/event/handler counts
#   SECTION:VERSIONS   — version freshness
#   SECTION:SETTINGS   — settings.json key gaps
#   SECTION:PLUGIN     — enabled/disabled state
#   SECTION:MCP        — opt-in MCP staleness
#   SECTION:AGENTS     — local agent overlap
#   SECTION:SESSIONS   — stale session count (for --aggressive)
#   SECTION:COST       — token-spend settings audit (read-only, suggest-only)
#   SECTION:MODE       — maintainer vs detect-only for CLAUDE.md edits

set -euo pipefail

# ---------------------------------------------------------------------------
# SECTION:CLONE
# ---------------------------------------------------------------------------
echo "SECTION:CLONE"

CLONE="${1:-}"
if [ -z "$CLONE" ]; then
  CLONE="$HOME/.claude/plugins/marketplaces/commander-hub/commander"
fi
if [ ! -d "$CLONE" ]; then
  # Try installed_plugins.json
  CLONE=$(node -e "
    try {
      const fs=require('fs');
      const d=JSON.parse(fs.readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
      const k=Object.keys(d.plugins||{}).find(k=>k.startsWith('commander'));
      if(k&&d.plugins[k]&&d.plugins[k][0]) process.stdout.write(d.plugins[k][0].installPath||'');
    } catch(e) {}
  " 2>/dev/null || echo "")
fi
[ -z "$CLONE" ] && CLONE="n/a"
echo "CLONE=$CLONE"

# ---------------------------------------------------------------------------
# SECTION:JUNK
# ---------------------------------------------------------------------------
echo "SECTION:JUNK"

# temp_* dirs in marketplace dir
# NOTE: `grep -c` always prints a count (0 on no-match) AND exits non-zero when
# nothing matched. Under `set -e` a bare assignment would abort the script, and
# `|| echo 0` would double-emit ("0\n0"). Trailing `|| true` swallows the exit
# code WITHOUT adding output; ${var:-0} guards the empty edge case.
JUNK_TEMP=$(ls "$HOME/.claude/plugins/marketplaces/" 2>/dev/null | grep -c '^temp_' || true)
echo "JUNK_TEMP=${JUNK_TEMP:-0}"

# Stale .bak/.old/.backup-* files older than 14d (outside tuneup-archive)
JUNK_BAK=$(find "$HOME/.claude" -maxdepth 5 \
  \( -name "*.bak" -o -name "*.old" -o -name "*.backup-*" \) \
  -mtime +14 \
  -not -path "$HOME/.claude/commander/tuneup-archive/*" \
  2>/dev/null | wc -l | tr -d ' ')
echo "JUNK_BAK=$JUNK_BAK"

# Archive-hook dupes: files in BOTH hooks/_archive/ AND hooks/ (by basename)
ARCHIVE_DUPES=0
if [ "$CLONE" != "n/a" ]; then
  HOOKS_DIR="$CLONE/commander/cowork-plugin/hooks"
  if [ -d "$HOOKS_DIR/_archive" ] && [ -d "$HOOKS_DIR" ]; then
    ARCHIVE_DUPES=$(comm -12 \
      <(ls "$HOOKS_DIR/_archive/" 2>/dev/null | sort) \
      <(ls "$HOOKS_DIR/" 2>/dev/null | grep '\.js$' | sort) \
      2>/dev/null | wc -l | tr -d ' ' || echo 0)
  fi
fi
echo "ARCHIVE_DUPES=$ARCHIVE_DUPES"

# ---------------------------------------------------------------------------
# SECTION:COUNTS  (live from filesystem + hooks.json — NO hardcoded values)
# ---------------------------------------------------------------------------
echo "SECTION:COUNTS"

SKILL_COUNT=n/a
AGENT_COUNT=n/a
EVENT_COUNT=n/a
HANDLER_COUNT=n/a
VENDOR_COUNT=n/a

if [ "$CLONE" != "n/a" ]; then
  PLUGIN_DIR="$CLONE/commander/cowork-plugin"

  # Skill count: directories under skills/
  SKILL_COUNT=$(ls -d "$PLUGIN_DIR/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')

  # Agent count: .md files under agents/
  AGENT_COUNT=$(find "$PLUGIN_DIR/agents" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

  # Event count + handler count: pure jq from hooks.json
  HOOKS_JSON="$PLUGIN_DIR/hooks/hooks.json"
  if [ -f "$HOOKS_JSON" ]; then
    EVENT_COUNT=$(jq '.hooks | keys | length' "$HOOKS_JSON" 2>/dev/null || echo n/a)
    # Sum all handler entries across all events and all groups
    HANDLER_COUNT=$(jq '[.hooks | to_entries[] | .value[] | (.hooks // []) | length] | add // 0' "$HOOKS_JSON" 2>/dev/null || echo n/a)
  fi

  # Vendor count: directories under vendor/ at repo root
  REPO_ROOT=$(git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null || echo "")
  if [ -n "$REPO_ROOT" ] && [ -d "$REPO_ROOT/vendor" ]; then
    VENDOR_COUNT=$(ls -d "$REPO_ROOT/vendor"/*/ 2>/dev/null | wc -l | tr -d ' ')
  fi
fi

echo "SKILL_COUNT=$SKILL_COUNT"
echo "AGENT_COUNT=$AGENT_COUNT"
echo "EVENT_COUNT=$EVENT_COUNT"
echo "HANDLER_COUNT=$HANDLER_COUNT"
echo "VENDOR_COUNT=$VENDOR_COUNT"

# ---------------------------------------------------------------------------
# SECTION:VERSIONS
# ---------------------------------------------------------------------------
echo "SECTION:VERSIONS"

# Installed version from installed_plugins.json or plugin.json
INSTALLED_VERSION=$(node -e "
  try {
    const fs=require('fs');
    const j=JSON.parse(fs.readFileSync(process.env.HOME+'/.claude/plugins/installed_plugins.json','utf8'));
    const k=Object.keys(j.plugins||{}).find(k=>k.startsWith('commander'));
    if(k&&j.plugins[k][0]) process.stdout.write(j.plugins[k][0].version||'n/a');
    else process.stdout.write('n/a');
  } catch(e) { process.stdout.write('n/a'); }
" 2>/dev/null || echo n/a)

# Fallback: read from plugin.json directly
if [ "$INSTALLED_VERSION" = "n/a" ] && [ "$CLONE" != "n/a" ]; then
  PLUGIN_JSON="$CLONE/commander/cowork-plugin/.claude-plugin/plugin.json"
  if [ -f "$PLUGIN_JSON" ]; then
    INSTALLED_VERSION=$(jq -r '.version // "n/a"' "$PLUGIN_JSON" 2>/dev/null || echo n/a)
  fi
fi
echo "INSTALLED_VERSION=$INSTALLED_VERSION"

# Cached remote version (< 4h old)
CACHE="$HOME/.claude/commander/update-cache.json"
CACHED_REMOTE_VERSION=$(node -e "
  try {
    const fs=require('fs');
    const d=JSON.parse(fs.readFileSync('$CACHE','utf8'));
    const age=Date.now()-d.timestamp;
    if(age<14400000) process.stdout.write(d.remoteVersion||'stale');
    else process.stdout.write('stale');
  } catch(e) { process.stdout.write('stale'); }
" 2>/dev/null || echo stale)
echo "CACHED_REMOTE_VERSION=$CACHED_REMOTE_VERSION"

# ---------------------------------------------------------------------------
# SECTION:SETTINGS
# ---------------------------------------------------------------------------
echo "SECTION:SETTINGS"

SETTINGS="$HOME/.claude/settings.json"
SETTINGS_MISSING_KEYS=none

if [ -f "$SETTINGS" ]; then
  SETTINGS_MISSING_KEYS=$(node -e "
    try {
      const fs=require('fs');
      const s=JSON.parse(fs.readFileSync('$SETTINGS','utf8'));
      const missing=[];
      if(s.showThinkingSummaries===undefined) missing.push('showThinkingSummaries');
      const env=s.env||{};
      if(env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS===undefined) missing.push('env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
      if(s.toolConcurrency===undefined) missing.push('toolConcurrency');
      process.stdout.write(missing.length?missing.join(','):'none');
    } catch(e) { process.stdout.write('parse-error'); }
  " 2>/dev/null || echo n/a)
fi
echo "SETTINGS_MISSING_KEYS=$SETTINGS_MISSING_KEYS"

# ---------------------------------------------------------------------------
# SECTION:PLUGIN
# ---------------------------------------------------------------------------
echo "SECTION:PLUGIN"

PLUGIN_ENABLED=n/a
PLUGIN_DISABLED_INSTALLED=no

if [ -f "$SETTINGS" ]; then
  # enabledPlugins is an OBJECT keyed by "<plugin>@<marketplace>" → boolean
  # (e.g. {"commander@commander-hub": true}), NOT an array. Tri-state:
  #   key present & true  → "yes"
  #   key present & false → "disabled"
  #   no key              → "missing"
  PLUGIN_ENABLED=$(node -e "
    try {
      const fs=require('fs');
      const d=JSON.parse(fs.readFileSync('$SETTINGS','utf8'));
      const ep=d.enabledPlugins;
      let out='missing';
      if(ep && typeof ep==='object' && !Array.isArray(ep)){
        const keys=Object.keys(ep).filter(k=>k.startsWith('commander@'));
        if(keys.length){ out=keys.some(k=>ep[k]===true)?'yes':'disabled'; }
      } else if(Array.isArray(ep)){
        // Legacy/array fallback: list of enabled plugin identifiers.
        out=ep.some(p=>typeof p==='string'&&p.startsWith('commander'))?'yes':'missing';
      }
      process.stdout.write(out);
    } catch(e) { process.stdout.write('parse-error'); }
  " 2>/dev/null || echo n/a)

  # Installed-but-disabled: clone present in marketplace but not actively enabled.
  if { [ "$PLUGIN_ENABLED" = "disabled" ] || [ "$PLUGIN_ENABLED" = "missing" ]; } \
     && [ -d "$HOME/.claude/plugins/marketplaces/commander-hub/commander" ]; then
    PLUGIN_DISABLED_INSTALLED=yes
  fi
fi
echo "PLUGIN_ENABLED=$PLUGIN_ENABLED"
echo "PLUGIN_DISABLED_INSTALLED=$PLUGIN_DISABLED_INSTALLED"

# ---------------------------------------------------------------------------
# SECTION:MCP  (opt-in MCP credential/config staleness)
# ---------------------------------------------------------------------------
echo "SECTION:MCP"

MCP_CONNECT_STALE=none

if [ -f "$SETTINGS" ]; then
  MCP_CONNECT_STALE=$(node -e "
    try {
      const fs=require('fs');
      const s=JSON.parse(fs.readFileSync('$SETTINGS','utf8'));
      const servers=s.mcpServers||{};
      const stale=[];
      for(const [name,cfg] of Object.entries(servers)){
        // Skip the 2 bundled ones (context7, sequential-thinking)
        if(name==='context7'||name==='sequential-thinking') continue;
        // Check if the command/binary is accessible
        const cmd=(cfg.command||'').split(' ')[0];
        if(cmd&&cmd!=='npx'&&cmd!=='node'){
          const childProc=require('child_process');
          const r=childProc.spawnSync('which',[cmd],{timeout:2000});
          if(r.status!==0) stale.push(name+':cmd-missing');
        }
      }
      process.stdout.write(stale.length?stale.join(','):'none');
    } catch(e) { process.stdout.write('n/a'); }
  " 2>/dev/null || echo n/a)
fi
echo "MCP_CONNECT_STALE=$MCP_CONNECT_STALE"

# ---------------------------------------------------------------------------
# SECTION:AGENTS  (local agent overlap with plugin agents)
# ---------------------------------------------------------------------------
echo "SECTION:AGENTS"

LOCAL_AGENT_OVERLAP=none

if [ -d "$HOME/.claude/agents" ] && [ "$CLONE" != "n/a" ]; then
  PLUGIN_AGENTS_DIR="$CLONE/commander/cowork-plugin/agents"
  if [ -d "$PLUGIN_AGENTS_DIR" ]; then
    LOCAL_AGENT_OVERLAP=$(comm -12 \
      <(ls "$HOME/.claude/agents/" 2>/dev/null | grep '\.md$' | sed 's/\.md$//' | sort) \
      <(ls "$PLUGIN_AGENTS_DIR/" 2>/dev/null | grep '\.md$' | sed 's/\.md$//' | sort) \
      2>/dev/null | paste -sd ',' - || echo none)
    [ -z "$LOCAL_AGENT_OVERLAP" ] && LOCAL_AGENT_OVERLAP=none
  fi
fi
echo "LOCAL_AGENT_OVERLAP=$LOCAL_AGENT_OVERLAP"

# ---------------------------------------------------------------------------
# SECTION:SESSIONS  (for --aggressive only; lowest priority)
# ---------------------------------------------------------------------------
echo "SECTION:SESSIONS"

SESSION_DIR="$HOME/.claude/sessions"
STALE_SESSIONS=0
if [ -d "$SESSION_DIR" ]; then
  STALE_SESSIONS=$(find "$SESSION_DIR" -maxdepth 1 -type f -mtime +30 2>/dev/null | wc -l | tr -d ' ')
fi
echo "STALE_SESSIONS=$STALE_SESSIONS"

# ---------------------------------------------------------------------------
# SECTION:COST  (token-spend settings audit — READ-ONLY, suggest-only)
# ---------------------------------------------------------------------------
# Surfaces high-impact, often-undocumented settings.json keys that reduce token
# spend. Emits one COST_<KEY> line per audited key as: current|suggested|verdict
# where verdict ∈ {ok, missing, suboptimal}. The skill body NEVER auto-applies
# these — it only suggests. A rollup COST_FLAGGED counts the non-ok keys.
echo "SECTION:COST"

if [ -f "$SETTINGS" ]; then
  node -e "
    try {
      const fs=require('fs');
      const s=JSON.parse(fs.readFileSync('$SETTINGS','utf8'));
      const env=s.env||{};
      const out=[];
      let flagged=0;
      // verdict helper: ok if current matches/satisfies the intent, else missing/suboptimal
      const emit=(key,current,suggested,verdict)=>{
        if(verdict!=='ok') flagged++;
        // pipe-delimited; '∅' marks an unset value so the table stays readable
        out.push('COST_'+key+'='+(current===undefined||current===null?'∅':current)+'|'+suggested+'|'+verdict);
      };

      // 1. effortLevel — lower effort = fewer thinking tokens on routine work.
      //    Unset inherits Anthropic default; explicit 'high' is the documented sweet spot.
      {
        const v=s.effortLevel;
        if(v===undefined) emit('effortLevel',undefined,'high','missing');
        else if(v==='xhigh') emit('effortLevel',v,'high (xhigh burns ~2x on routine work)','suboptimal');
        else emit('effortLevel',v,'high','ok');
      }

      // 2. autoCompactEnabled — auto-compaction caps runaway context growth.
      {
        const v=s.autoCompactEnabled;
        if(v===undefined) emit('autoCompactEnabled',undefined,'true','missing');
        else if(v===false) emit('autoCompactEnabled',v,'true (prevents context-overflow re-reads)','suboptimal');
        else emit('autoCompactEnabled',v,'true','ok');
      }

      // 3. MAX_THINKING_TOKENS — caps the per-turn thinking budget. Uncapped can
      //    spend up to ~32k tokens/turn on reasoning. A cap (e.g. 10000) trims spend.
      {
        const v=env.MAX_THINKING_TOKENS;
        if(v===undefined) emit('MAX_THINKING_TOKENS',undefined,'10000 (caps per-turn reasoning spend)','missing');
        else emit('MAX_THINKING_TOKENS',v,'10000','ok');
      }

      // 4. ENABLE_TOOL_SEARCH / deferred tools — defers MCP tool schemas so they
      //    are not all loaded into context up front (big saver with many MCP servers).
      {
        const v=env.ENABLE_TOOL_SEARCH;
        if(v===undefined) emit('ENABLE_TOOL_SEARCH',undefined,'1 (defer MCP tool schemas — saves heavily w/ many servers)','missing');
        else if(v==='0'||v===false||v==='false') emit('ENABLE_TOOL_SEARCH',v,'1','suboptimal');
        else emit('ENABLE_TOOL_SEARCH',v,'1','ok');
      }

      // 5. showThinkingSummaries — summaries cost fewer output tokens than full thinking.
      {
        const v=s.showThinkingSummaries;
        if(v===undefined) emit('showThinkingSummaries',undefined,'true (summaries < full thinking output)','missing');
        else emit('showThinkingSummaries',v,'true','ok');
      }

      // 6. cleanupPeriodDays — bounds on-disk transcript retention (indirect: smaller
      //    resume/search surface). Default is generous; a tighter window trims clutter.
      {
        const v=s.cleanupPeriodDays;
        if(v===undefined) emit('cleanupPeriodDays',undefined,'30 (bound transcript retention)','missing');
        else emit('cleanupPeriodDays',v,'30','ok');
      }

      // 7. model — pinning a heavyweight model for the MAIN thread spends $$$ on
      //    routine turns. Suggest letting subagents downshift (Haiku/Sonnet) rather
      //    than pinning Opus/Fable globally. DETECT-ONLY: never suggest a swap of the
      //    user's deliberate choice — just surface the cost note when a premium pin exists.
      {
        const v=s.model;
        if(v===undefined) emit('model',undefined,'unset (let routing downshift subagents)','ok');
        else if(/opus|fable/i.test(String(v))) emit('model',v,'route routine work to Sonnet/Haiku subagents','suboptimal');
        else emit('model',v,String(v),'ok');
      }

      out.push('COST_FLAGGED='+flagged);
      process.stdout.write(out.join('\n'));
    } catch(e) { process.stdout.write('COST_FLAGGED=n/a'); }
  " 2>/dev/null || echo "COST_FLAGGED=n/a"
  echo ""
else
  echo "COST_FLAGGED=n/a"
fi

# ---------------------------------------------------------------------------
# SECTION:MODE  (maintainer vs detect-only for CLAUDE.md count edits)
# ---------------------------------------------------------------------------
echo "SECTION:MODE"

CLAUDE_MD_MODE=detect-only
if [ "$CLONE" != "n/a" ]; then
  GIT_ROOT=$(git -C "$CLONE" rev-parse --show-toplevel 2>/dev/null || echo "")
  if [ -n "$GIT_ROOT" ]; then
    ROOT_BASENAME=$(basename "$GIT_ROOT")
    AUDIT_SCRIPT="$GIT_ROOT/scripts/audit-counts.js"
    if [ "$ROOT_BASENAME" = "cc-commander" ] && [ -f "$AUDIT_SCRIPT" ]; then
      CLAUDE_MD_MODE=maintainer
    fi
  fi
fi
echo "CLAUDE_MD_MODE=$CLAUDE_MD_MODE"

echo "SECTION:DONE"
