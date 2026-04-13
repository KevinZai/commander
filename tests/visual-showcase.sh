#!/bin/bash
# =============================================================================
# CC Commander — Visual Showcase
# =============================================================================
# Drives `ccc --simple` through every menu path via tmux, capturing ANSI
# screenshots at each stop. Produces a self-contained HTML gallery.
#
# Usage:
#   bash tests/visual-showcase.sh [--no-gallery] [--outdir PATH]
#
# Requirements: tmux, node
#
# Navigation note:
#   The TUI uses positional letter shortcuts (a=item[0], b=item[1], ...) NOT
#   the adventure JSON key fields. To avoid separator collisions we navigate
#   with arrow keys: reset cursor to top, press Down N times, then Enter.
#   This is deterministic regardless of separator placement.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SESSION="ccc-showcase"
OUTDIR="$PROJECT_DIR/screenshots/showcase"
SCREENSHOT_NUM=0
PASS=0
FAIL=0
GENERATE_GALLERY=1
TERM_WIDTH=120
TERM_HEIGHT=40

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-gallery)  GENERATE_GALLERY=0; shift ;;
    --outdir)      OUTDIR="$2"; shift 2 ;;
    *)             echo "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$OUTDIR"
cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
log()  { echo "$*"; }
ok()   { echo "  PASS  $*"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $*"; FAIL=$((FAIL + 1)); }

# Capture current visible tmux pane rows (not scrollback).
# Files: $OUTDIR/<NN>-<name>.{ansi,txt}
capture() {
  local name="$1"
  local num
  num=$(printf "%02d" "$SCREENSHOT_NUM")
  SCREENSHOT_NUM=$((SCREENSHOT_NUM + 1))
  tmux capture-pane -t "$SESSION" -e -p -S 0 -E - > "$OUTDIR/${num}-${name}.ansi"
  tmux capture-pane -t "$SESSION"    -p -S 0 -E - > "$OUTDIR/${num}-${name}.txt"
  log "  captured  ${num}-${name}"
}

# Validate the most-recently-captured .txt file contains a pattern (ERE).
validate() {
  local name="$1"
  local expected="$2"
  local num
  num=$(printf "%02d" "$((SCREENSHOT_NUM - 1))")
  local file="$OUTDIR/${num}-${name}.txt"
  if grep -Eqi "$expected" "$file" 2>/dev/null; then
    ok "$name — found: \"$expected\""
  else
    fail "$name — missing: \"$expected\""
  fi
}

# Run a non-interactive command and save ANSI + stripped plain text.
capture_cmd() {
  local name="$1"
  shift
  local num
  num=$(printf "%02d" "$SCREENSHOT_NUM")
  SCREENSHOT_NUM=$((SCREENSHOT_NUM + 1))
  script -q /dev/null "$@" > "$OUTDIR/${num}-${name}.ansi" 2>/dev/null || true
  sed $'s/\033\\[[0-9;]*[A-Za-z]//g' \
    "$OUTDIR/${num}-${name}.ansi" > "$OUTDIR/${num}-${name}.txt" 2>/dev/null || true
  log "  captured  ${num}-${name}"
}

# ---------------------------------------------------------------------------
# tmux helpers
# ---------------------------------------------------------------------------
send() { tmux send-keys -t "$SESSION" "$@"; }

# Poll until pane content stabilises.
wait_stable() {
  local timeout="${1:-3}"
  local interval="0.2"
  local elapsed="0"
  local prev=""
  while (( $(echo "$elapsed < $timeout" | bc -l) )); do
    local cur
    cur=$(tmux capture-pane -t "$SESSION" -p -S 0 -E - 2>/dev/null || true)
    if [[ "$cur" == "$prev" && -n "$cur" ]]; then return 0; fi
    prev="$cur"
    sleep "$interval"
    elapsed=$(echo "$elapsed + $interval" | bc -l)
  done
  return 0
}

# Poll until pane (visible rows) contains an ERE pattern.
wait_for() {
  local pattern="$1"
  local timeout="${2:-5}"
  local interval="0.2"
  local elapsed="0"
  while (( $(echo "$elapsed < $timeout" | bc -l) )); do
    local cur
    cur=$(tmux capture-pane -t "$SESSION" -p -S 0 -E - 2>/dev/null || true)
    if echo "$cur" | grep -Eqi "$pattern" 2>/dev/null; then
      sleep 0.2
      return 0
    fi
    sleep "$interval"
    elapsed=$(echo "$elapsed + $interval" | bc -l)
  done
  log "  WARNING: timed out waiting for: $pattern"
  return 0
}

# Check if TUI is still active (nav footer visible).
tui_alive() {
  local cur
  cur=$(tmux capture-pane -t "$SESSION" -p -S 0 -E - 2>/dev/null || true)
  echo "$cur" | grep -Eqi "navigate.*select|↑↓.*navigate" 2>/dev/null
}

# Navigate from top of main menu: press Up many times to reset position,
# then press Down N times, then Enter to select.
# This works because Up is clamped at the first selectable item.
nav_to() {
  local downs="$1"
  if ! tui_alive; then
    log "  WARNING: TUI not alive — skipping nav_to $downs"
    return 0
  fi
  # Reset to first item (Up clamped, each press ignored at top)
  local i
  for i in $(seq 1 20); do send Up; sleep 0.04; done
  sleep 0.3
  # Navigate down to target
  for i in $(seq 1 "$downs"); do
    send Down; sleep 0.12
  done
  sleep 0.2
  # Select
  send Enter
  # Wait for new screen to render and stabilise
  sleep 0.5
  wait_stable 2
}

# Press q: TUI finds Back/Quit item by label scan and selects it.
# Wait until main menu re-appears.
nav_back() {
  if ! tui_alive; then
    log "  WARNING: TUI not alive — skipping nav_back"
    return 0
  fi
  send "q"
  wait_for "What would you like to do" 5
  wait_stable 2
}

arrow_down() { send Down; sleep 0.2; }
arrow_up()   { send Up;   sleep 0.2; }

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
cleanup() {
  tmux kill-session -t "$SESSION" 2>/dev/null || true
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Phase 1 — Non-interactive CLI flag screenshots
# ---------------------------------------------------------------------------
phase1_cli_flags() {
  log ""
  log "Phase 1: Non-interactive CLI flags"
  log "-----------------------------------"

  capture_cmd "version"   node bin/kc.js --version
  capture_cmd "help"      node bin/kc.js --help
  capture_cmd "status"    node bin/kc.js --status
  capture_cmd "stats"     node bin/kc.js --stats

  {
    node bin/kc.js --list-skills 2>/dev/null | head -40
  } > "$OUTDIR/$(printf "%02d" "$SCREENSHOT_NUM")-list-skills.ansi" || true
  cp "$OUTDIR/$(printf "%02d" "$SCREENSHOT_NUM")-list-skills.ansi" \
     "$OUTDIR/$(printf "%02d" "$SCREENSHOT_NUM")-list-skills.txt"   2>/dev/null || true
  log "  captured  $(printf "%02d" "$SCREENSHOT_NUM")-list-skills"
  SCREENSHOT_NUM=$((SCREENSHOT_NUM + 1))

  capture_cmd "self-test" node bin/kc.js --test

  local v_file h_file
  v_file=$(ls "$OUTDIR"/??-version.ansi  2>/dev/null | head -1 || true)
  h_file=$(ls "$OUTDIR"/??-help.ansi     2>/dev/null | head -1 || true)
  [[ -n "$v_file" ]] && grep -Eqi "commander|v[0-9]" "$v_file" \
    && ok "version output" || fail "version output"
  [[ -n "$h_file" ]] && grep -Eqi "dispatch|Usage|--help" "$h_file" \
    && ok "help output" || fail "help output"
}

# ---------------------------------------------------------------------------
# Phase 2 — Interactive TUI navigation
#
# Main menu selectable item positions (Down-presses from top, separators skipped):
#   0 = Open a project          6 = Check my stats
#   1 = Build something new     7 = Linear board (if LINEAR_API_KEY set)
#   2 = Create content          8 = Night Mode
#   3 = Research & analyze      9 = Settings
#   4 = Review what I built    10 = Change theme
#   5 = Learn a new skill      11 = Infrastructure & Fleet
#                              12 = Type a command
#
# Note: Linear board shows if LINEAR_API_KEY is in the env.
# If Linear is absent, all positions ≥7 shift down by 1.
# The script detects this and adjusts automatically.
# ---------------------------------------------------------------------------
phase2_interactive() {
  log ""
  log "Phase 2: Interactive TUI navigation"
  log "-------------------------------------"

  tmux kill-session -t "$SESSION" 2>/dev/null || true
  sleep 0.3

  tmux new-session -d -s "$SESSION" -x "$TERM_WIDTH" -y "$TERM_HEIGHT"
  tmux set-option -t "$SESSION" status off

  tmux send-keys -t "$SESSION" \
    "cd '$PROJECT_DIR' && node bin/kc.js --simple 2>/dev/null" \
    Enter

  wait_for "What would you like to do" 12
  sleep 1.0   # let logo animation + welcome dashboard fully render

  # Detect if Linear board is present (adds one item, shifts later positions).
  # Positions are Down-press counts from top (arrow-key skips separators).
  # Computed at runtime via the same logic as tui.select().
  local lin_offset=0
  if tmux capture-pane -t "$SESSION" -p -S 0 -E - 2>/dev/null | grep -qi "Linear board"; then
    lin_offset=1
    log "  Linear board detected"
  else
    log "  No linear board"
  fi
  # Base positions WITHOUT linear board (DOWN×N from top):
  #   0=OpenProject  4=ReviewWork  7=NightMode    10=ChangeTheme
  #   1=BuildNew     5=LearnSkill  8=Settings     11=Infrastructure
  #   2=CreateContent 6=CheckStats 9=(reserved)   12=TypeCommand
  #   3=Research
  # With linear board present, add lin_offset to positions >=7.
  local p_night=$((7 + lin_offset))
  local p_settings=$((8 + lin_offset))
  local p_theme=$((9 + lin_offset))
  local p_infra=$((10 + lin_offset))

  # ------------------------------------------------------------------
  # 1. Main menu — initial state
  # ------------------------------------------------------------------
  capture "main-menu"
  validate "main-menu" "What would you like to do"

  # ------------------------------------------------------------------
  # 2. Build something new (Down×1 from top)
  # ------------------------------------------------------------------
  log "  nav: Build something new (down 1)"
  nav_to 1
  capture "build-something"
  validate "build-something" "Build Something|What kind of project"
  nav_back

  # ------------------------------------------------------------------
  # 3. Create content (Down×2)
  # ------------------------------------------------------------------
  log "  nav: Create content (down 2)"
  nav_to 2
  capture "create-content"
  validate "create-content" "Create Content|Pick a content"
  nav_back

  # ------------------------------------------------------------------
  # 4. Research & analyze (Down×3)
  # ------------------------------------------------------------------
  log "  nav: Research & analyze (down 3)"
  nav_to 3
  capture "research-analyze"
  validate "research-analyze" "Research|Analyze|competitive"
  nav_back

  # ------------------------------------------------------------------
  # 5. Learn a new skill (Down×5)
  # ------------------------------------------------------------------
  log "  nav: Learn a new skill (down 5)"
  nav_to 5
  capture "learn-skill"
  validate "learn-skill" "Learn|Skill|Browse|explore"
  nav_back

  # ------------------------------------------------------------------
  # 6. Check my stats (Down×6)
  #    adventure runs show_stats action then afterAction menu.
  # ------------------------------------------------------------------
  log "  nav: Check my stats (down 6)"
  nav_to 6
  wait_for "achievement|sessions|Stats|streak|What next" 6
  sleep 0.3
  capture "check-stats"
  validate "check-stats" "achievement|sessions|Stats|streak|What next"
  nav_back

  # ------------------------------------------------------------------
  # 7. Review what I built (Down×4)
  #    adventure runs show_recent_sessions then afterAction menu.
  # ------------------------------------------------------------------
  log "  nav: Review what I built (down 4)"
  nav_to 4
  wait_for "Resume a session|View session|history|What would you like to do" 6
  sleep 0.3
  capture "review-work"
  validate "review-work" "Resume|session|history|View"
  nav_back

  # ------------------------------------------------------------------
  # 8. Night Mode / YOLO Mode (Down×8 with lin_offset)
  # ------------------------------------------------------------------
  log "  nav: Night Mode (down $p_night)"
  nav_to "$p_night"
  capture "night-mode"
  validate "night-mode" "Night|YOLO|autonomous|Launch"
  nav_back

  # ------------------------------------------------------------------
  # 9. Settings (Down×9 with lin_offset)
  # ------------------------------------------------------------------
  log "  nav: Settings (down $p_settings)"
  nav_to "$p_settings"
  capture "settings"
  validate "settings" "Settings|Change my name|Change experience|theme"
  nav_back

  # ------------------------------------------------------------------
  # 10. Infrastructure & Fleet (Down×11 with lin_offset)
  # ------------------------------------------------------------------
  log "  nav: Infrastructure & Fleet (down $p_infra)"
  nav_to "$p_infra"
  capture "infrastructure"
  validate "infrastructure" "Infrastructure|Fleet Commander|Synapse|CloudCLI"
  nav_back

  # ------------------------------------------------------------------
  # 11. Help overlay (? key — works from main menu at any cursor pos)
  # ------------------------------------------------------------------
  log "  nav: Help overlay (?)"
  wait_for "What would you like to do" 4
  if tui_alive; then
    tmux send-keys -t "$SESSION" "?" ""
    sleep 0.8
    capture "help-overlay"
    send Escape
    sleep 0.5
    send " "
    sleep 0.3
    wait_stable 2
  fi

  # ------------------------------------------------------------------
  # 12. Theme picker (Down×10 with lin_offset → "Change theme")
  # ------------------------------------------------------------------
  log "  nav: Theme picker (down $p_theme)"
  wait_for "What would you like to do" 4
  if tui_alive; then
    nav_to "$p_theme"
    sleep 1.2
    capture "theme-picker"
    validate "theme-picker" "theme|Theme|orange|neon|dark|light|colour|color"

    arrow_down
    sleep 0.4
    capture "theme-preview-1"

    arrow_down
    sleep 0.4
    capture "theme-preview-2"

    # Cancel theme picker: q → done(-1) since no Quit/Back label
    send "q"
    sleep 0.6
    send Escape
    sleep 0.4
  fi

  # ------------------------------------------------------------------
  # 13. Final main menu — confirm clean return
  # ------------------------------------------------------------------
  wait_for "What would you like to do" 5
  capture "main-menu-final"
  validate "main-menu-final" "What would you like to do"

  # Quit the TUI cleanly
  log "  nav: Quit (q)"
  if tui_alive; then
    # Navigate to Quit item using q shortcut (special label scan)
    send "q"
    sleep 0.8
  fi
}

# ---------------------------------------------------------------------------
# Phase 3 — Self-contained HTML gallery
# ---------------------------------------------------------------------------
phase3_gallery() {
  [[ "$GENERATE_GALLERY" -eq 0 ]] && return 0

  log ""
  log "Phase 3: Generating HTML gallery"
  log "----------------------------------"

  local gallery="$OUTDIR/index.html"

  node - "$OUTDIR" "$gallery" << 'NODESCRIPT'
'use strict';
var fs   = require('fs');
var path = require('path');

var srcDir  = process.argv[2];
var outFile = process.argv[3];

function ansiToHtml(raw) {
  var FG16 = {
    30:'#555',    31:'#d54e53', 32:'#98c379', 33:'#e5c07b',
    34:'#61aeee', 35:'#c678dd', 36:'#56b6c2', 37:'#ddd',
    90:'#777',    91:'#ff6c6b', 92:'#b5e78a', 93:'#f9da6a',
    94:'#82b3f9', 95:'#f28fad', 96:'#73d5e3', 97:'#fff'
  };
  var BG16 = {
    40:'#2a2a2a', 41:'#4a1a1a', 42:'#1a3a1a', 43:'#3a2a1a',
    44:'#1a1a4a', 45:'#3a1a3a', 46:'#1a3a3a', 47:'#aaa',
    100:'#555', 101:'#f66', 102:'#8c8', 103:'#dd8',
    104:'#66f', 105:'#f8f', 106:'#6dd', 107:'#eee'
  };

  var out = '';
  var bold = false, italic = false, underline = false;
  var fg = null, bg = null;

  function styledSpan(text) {
    var parts = [];
    if (fg)        parts.push('color:' + fg);
    if (bg)        parts.push('background:' + bg);
    if (bold)      parts.push('font-weight:bold');
    if (italic)    parts.push('font-style:italic');
    if (underline) parts.push('text-decoration:underline');
    var s = parts.join(';');
    return s ? '<span style="' + s + '">' + text + '</span>' : text;
  }

  var re = /(\x1b\[([0-9;]*)([A-Za-z]))|([^\x1b\r]+)/g;
  var m;
  while ((m = re.exec(raw)) !== null) {
    if (m[4] !== undefined) {
      var text = m[4]
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      out += styledSpan(text);
    } else if (m[3] === 'm') {
      var codes = (m[2] || '0').split(';').map(Number);
      var i = 0;
      while (i < codes.length) {
        var c = codes[i];
        if      (c === 0)  { bold=false; italic=false; underline=false; fg=null; bg=null; }
        else if (c === 1)  bold = true;
        else if (c === 3)  italic = true;
        else if (c === 4)  underline = true;
        else if (c === 22) bold = false;
        else if (c === 23) italic = false;
        else if (c === 24) underline = false;
        else if (c === 39) fg = null;
        else if (c === 49) bg = null;
        else if (FG16[c])  fg = FG16[c];
        else if (BG16[c])  bg = BG16[c];
        else if (c === 38 && codes[i+1] === 5) {
          fg = FG16[codes[i+2]] || ('hsl(' + ((codes[i+2]*37)%360) + ',60%,60%)');
          i += 2;
        }
        else if (c === 38 && codes[i+1] === 2) {
          fg = 'rgb(' + (codes[i+2]||0) + ',' + (codes[i+3]||0) + ',' + (codes[i+4]||0) + ')';
          i += 4;
        }
        else if (c === 48 && codes[i+1] === 5) {
          bg = BG16[codes[i+2]] || ('hsl(' + ((codes[i+2]*37)%360) + ',30%,18%)');
          i += 2;
        }
        else if (c === 48 && codes[i+1] === 2) {
          bg = 'rgb(' + (codes[i+2]||0) + ',' + (codes[i+3]||0) + ',' + (codes[i+4]||0) + ')';
          i += 4;
        }
        i++;
      }
    }
  }
  return out;
}

var ansiFiles = fs.readdirSync(srcDir)
  .filter(function(f) { return f.endsWith('.ansi'); })
  .sort(function(a, b) {
    var na = parseInt((a.match(/^(\d+)/) || ['0','0'])[1], 10);
    var nb = parseInt((b.match(/^(\d+)/) || ['0','0'])[1], 10);
    return na - nb;
  });

var cards = ansiFiles.map(function(filename) {
  var label = filename.replace(/\.ansi$/, '').replace(/^\d+-/, '');
  var raw   = fs.readFileSync(path.join(srcDir, filename), 'utf8');
  return { label: label, body: ansiToHtml(raw) };
});

var toc = cards.map(function(c) {
  return '      <li><a href="#' + c.label + '">' + c.label.replace(/-/g, ' ') + '</a></li>';
}).join('\n');

var cardHtml = cards.map(function(c) {
  return (
    '\n  <section class="card" id="' + c.label + '">\n' +
    '    <h2>' + c.label.replace(/-/g, ' ') + '</h2>\n' +
    '    <pre class="terminal">' + (c.body || '<span class="dim">(empty capture)</span>') + '</pre>\n  </section>'
  );
}).join('\n');

var ts = new Date().toISOString();
var html = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>CC Commander \u2014 Visual Showcase</title>',
  '<style>',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{background:#0d1117;color:#e6edf3;font-family:\'JetBrains Mono\',\'Cascadia Code\',Consolas,monospace;padding:2rem 1.5rem;max-width:1400px;margin:0 auto}',
  'h1{color:#ff6600;font-size:1.5rem;margin-bottom:.3rem}',
  '.meta{color:#555;font-size:.76rem;margin-bottom:1.5rem}',
  'nav{background:#161b22;border:1px solid #21262d;border-radius:6px;padding:1rem;margin-bottom:2rem}',
  'nav h3{color:#ff6600;font-size:.76rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.6rem}',
  'nav ol{padding-left:1.3rem}',
  'nav li{margin:.18rem 0}',
  'nav a{color:#8b949e;text-decoration:none;font-size:.76rem}',
  'nav a:hover{color:#ff6600}',
  '.card{margin-bottom:1.8rem;border:1px solid #21262d;border-radius:8px;overflow:hidden}',
  '.card h2{background:#161b22;color:#ff6600;padding:.45rem 1rem;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid #21262d}',
  '.terminal{background:#0d1117;padding:1rem;overflow-x:auto;white-space:pre;font-size:.78rem;line-height:1.48;min-height:4rem}',
  '.dim{color:#2a2a2a}',
  '.back{display:inline-block;margin-top:1.5rem;color:#ff6600;text-decoration:none;font-size:.76rem}',
  '</style>',
  '</head>',
  '<body>',
  '<h1>CC Commander \u2014 Visual Showcase</h1>',
  '<p class="meta">Generated ' + ts + ' \u2014 ' + cards.length + ' screenshots \u2014 120\u00d740 terminal</p>',
  '<nav>',
  '  <h3>Screenshots (' + cards.length + ')</h3>',
  '  <ol>',
  toc,
  '  </ol>',
  '</nav>',
  cardHtml,
  '',
  '<a class="back" href="#">\u2191 Back to top</a>',
  '</body>',
  '</html>'
].join('\n');

fs.writeFileSync(outFile, html, 'utf8');
console.log('Gallery: ' + outFile + '  (' + cards.length + ' screenshots)');
NODESCRIPT
}

# ---------------------------------------------------------------------------
# Validate Phase 1 output files exist
# ---------------------------------------------------------------------------
validate_phase1_files() {
  for label in "version" "help" "status" "stats" "list-skills" "self-test"; do
    local found
    found=$(ls "$OUTDIR"/??-"${label}".ansi 2>/dev/null | head -1 || true)
    if [[ -n "$found" ]]; then
      ok "phase1 file: $label"
    else
      fail "phase1 file missing: $label"
    fi
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
log ""
log "CC Commander — Visual Showcase"
log "================================"
log "Output: $OUTDIR"
log ""

if ! command -v tmux &>/dev/null; then
  log "WARNING: tmux not found — skipping Phase 2 (interactive TUI captures)"
  phase1_cli_flags
  validate_phase1_files
  phase3_gallery
else
  phase1_cli_flags
  validate_phase1_files
  phase2_interactive
  phase3_gallery
fi

log ""
log "================================"
log "Showcase complete"
log "  Screenshots : $SCREENSHOT_NUM"
log "  Pass        : $PASS"
log "  Fail        : $FAIL"
log "  Output dir  : $OUTDIR"
[[ "$GENERATE_GALLERY" -eq 1 ]] && log "  Gallery     : $OUTDIR/index.html"
log ""

exit "$FAIL"
