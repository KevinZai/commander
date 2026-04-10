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
# Navigation model:
#   - Letter shortcuts (a-z) jump directly to the menu item at that key binding
#   - `q` finds the "Quit" or "Back to main menu" item and selects it
#   - Arrow keys + Enter also work for cursor-style navigation
#   - After any navigation we poll until the main menu re-appears before continuing
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

# Capture current tmux pane (ANSI + plain-text).
# Files: $OUTDIR/<NN>-<name>.{ansi,txt}
capture() {
  local name="$1"
  local num
  num=$(printf "%02d" "$SCREENSHOT_NUM")
  SCREENSHOT_NUM=$((SCREENSHOT_NUM + 1))
  # -S 0 -E - : capture only the currently visible rows (not scrollback)
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
  # macOS script(1) preserves ANSI colour codes; ignore non-zero exits.
  script -q /dev/null "$@" > "$OUTDIR/${num}-${name}.ansi" 2>/dev/null || true
  # Strip basic CSI/SGR escapes for validation copy.
  sed $'s/\033\\[[0-9;]*[A-Za-z]//g' \
    "$OUTDIR/${num}-${name}.ansi" > "$OUTDIR/${num}-${name}.txt" 2>/dev/null || true
  log "  captured  ${num}-${name}"
}

# ---------------------------------------------------------------------------
# tmux navigation helpers
# ---------------------------------------------------------------------------
send() { tmux send-keys -t "$SESSION" "$@"; }

# Poll until pane content stabilises (two identical consecutive snapshots).
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

# Poll until pane contains an ERE pattern, with timeout.
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

# Check if the CCC TUI is still running (pane shows its prompt, not a shell).
tui_alive() {
  local cur
  cur=$(tmux capture-pane -t "$SESSION" -p -S 0 -E - 2>/dev/null || true)
  # TUI is alive if pane has the nav footer or the menu prompt
  echo "$cur" | grep -Eqi "navigate.*select|What would you like to do|↑↓" 2>/dev/null
}

wait_render() { wait_stable 2; }

# Press a letter key and wait for the screen to re-render.
nav_key() {
  local k="$1"
  if ! tui_alive; then
    log "  WARNING: TUI not alive before nav_key '${k}' — skipping"
    return 0
  fi
  send "$k"
  # Give the engine time to process the key and paint the new screen.
  # Rendering is synchronous; 0.6s is generous for any startup overhead.
  sleep 0.6
  wait_stable 2
}

# Press q (TUI scans items for Back/Quit by label) and wait for main menu.
# Only called from INSIDE a sub-menu — NOT from the main menu (which quits).
nav_back() {
  if ! tui_alive; then
    log "  WARNING: TUI not alive before nav_back — skipping"
    return 0
  fi
  send "q"
  # Wait until main menu re-appears, then let animation settle
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

  # list-skills piped through head — capture_cmd can't handle pipelines.
  {
    node bin/kc.js --list-skills 2>/dev/null | head -40
  } > "$OUTDIR/$(printf "%02d" "$SCREENSHOT_NUM")-list-skills.ansi" || true
  cp "$OUTDIR/$(printf "%02d" "$SCREENSHOT_NUM")-list-skills.ansi" \
     "$OUTDIR/$(printf "%02d" "$SCREENSHOT_NUM")-list-skills.txt"   2>/dev/null || true
  log "  captured  $(printf "%02d" "$SCREENSHOT_NUM")-list-skills"
  SCREENSHOT_NUM=$((SCREENSHOT_NUM + 1))

  capture_cmd "self-test" node bin/kc.js --test

  # Content validation
  local v_file h_file
  v_file=$(ls "$OUTDIR"/??-version.ansi  2>/dev/null | head -1 || true)
  h_file=$(ls "$OUTDIR"/??-help.ansi     2>/dev/null | head -1 || true)
  [[ -n "$v_file" ]] && grep -Eqi "commander|v[0-9]" "$v_file" \
    && ok "version output" || fail "version output"
  [[ -n "$h_file" ]] && grep -Eqi "dispatch|Usage|--help" "$h_file" \
    && ok "help output" || fail "help output"
}

# ---------------------------------------------------------------------------
# Phase 2 — Interactive TUI navigation via tmux
# ---------------------------------------------------------------------------
phase2_interactive() {
  log ""
  log "Phase 2: Interactive TUI navigation"
  log "-------------------------------------"

  # Kill any leftover session completely
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  sleep 0.3

  # Deterministic terminal size; blank slate
  tmux new-session -d -s "$SESSION" -x "$TERM_WIDTH" -y "$TERM_HEIGHT"

  # Suppress status bar to keep pane captures clean
  tmux set-option -t "$SESSION" status off

  # Launch CCC in simple (single-pane, no tmux split) mode.
  # CCC_SIMPLE=1 is the env equivalent of --simple.
  tmux send-keys -t "$SESSION" \
    "cd '$PROJECT_DIR' && CCC_SIMPLE=1 node bin/kc.js --simple 2>/dev/null" \
    Enter

  # Wait until the main menu prompt appears in the visible pane
  wait_for "What would you like to do" 12
  sleep 0.8   # let logo animation settle fully

  # ------------------------------------------------------------------
  # 1. Main menu — initial state
  # ------------------------------------------------------------------
  capture "main-menu"
  validate "main-menu" "What would you like to do|CC COMMANDER"

  # ------------------------------------------------------------------
  # 2. Build something new  (key: b → adventure: build-something)
  #    Sub-choices all lead to freeform text prompts; stop at the list.
  # ------------------------------------------------------------------
  log "  nav: Build something new (b)"
  nav_key "b"
  capture "build-something"
  validate "build-something" "Build|project|website|API|CLI"
  nav_back

  # ------------------------------------------------------------------
  # 3. Create content  (key: c → adventure: create-content)
  # ------------------------------------------------------------------
  log "  nav: Create content (c)"
  nav_key "c"
  capture "create-content"
  validate "create-content" "Content|content|Blog|Social|Email"
  nav_back

  # ------------------------------------------------------------------
  # 4. Research & analyze  (key: d → adventure: research)
  # ------------------------------------------------------------------
  log "  nav: Research & analyze (d)"
  nav_key "d"
  capture "research-analyze"
  validate "research-analyze" "Research|Analyze|competitive"
  nav_back

  # ------------------------------------------------------------------
  # 5. Learn a new skill  (key: f → adventure: learn-skill)
  # ------------------------------------------------------------------
  log "  nav: Learn a new skill (f)"
  nav_key "f"
  capture "learn-skill"
  validate "learn-skill" "Learn|Skill|Browse|explore|skill"
  nav_back

  # ------------------------------------------------------------------
  # 6. Check my stats  (key: g → adventure: check-stats)
  #    Triggers action show_stats which displays local data, then
  #    shows afterAction menu. afterAction has q → "Back to main menu".
  # ------------------------------------------------------------------
  log "  nav: Check my stats (g)"
  nav_key "g"
  capture "check-stats"
  validate "check-stats" "Stats|streak|achievement|session|Session"
  nav_back

  # ------------------------------------------------------------------
  # 7. Review what I built  (key: e → adventure: review-work)
  #    Triggers show_recent_sessions then afterAction menu.
  # ------------------------------------------------------------------
  log "  nav: Review what I built (e)"
  nav_key "e"
  capture "review-work"
  validate "review-work" "Review|session|history|Resume|recent"
  nav_back

  # ------------------------------------------------------------------
  # 8. Night Mode / YOLO Mode  (key: n → adventure: night-build)
  # ------------------------------------------------------------------
  log "  nav: Night Mode (n)"
  nav_key "n"
  capture "night-mode"
  validate "night-mode" "Night|YOLO|autonomous"
  nav_back

  # ------------------------------------------------------------------
  # 9. Settings  (key: s → adventure: settings)
  #    All sub-items are actions; we capture the menu screen then go back.
  #    Settings back: key q → "Back to main menu" (next: main-menu).
  # ------------------------------------------------------------------
  log "  nav: Settings (s)"
  nav_key "s"
  capture "settings"
  validate "settings" "Settings|Change|theme|level"
  nav_back

  # ------------------------------------------------------------------
  # 10. Infrastructure & Fleet  (key: x → adventure: infrastructure)
  #     All sub-items are actions; capture the menu then go back.
  #     Back item: key j, label "Back to main menu", action "back".
  # ------------------------------------------------------------------
  log "  nav: Infrastructure & Fleet (x)"
  nav_key "x"
  capture "infrastructure"
  validate "infrastructure" "Infrastructure|Fleet|Commander|Synapse"
  nav_back

  # ------------------------------------------------------------------
  # 11. Help overlay  (key: ?)
  #     Renders over the current screen; any key dismisses it.
  #     The overlay does NOT change TUI state — it's purely cosmetic.
  # ------------------------------------------------------------------
  log "  nav: Help overlay (?)"
  # Send literal ?
  tmux send-keys -t "$SESSION" "?" ""
  sleep 0.8
  capture "help-overlay"
  # Dismiss with Escape first, Space as fallback
  send Escape
  sleep 0.5
  send " "
  sleep 0.3
  wait_render

  # ------------------------------------------------------------------
  # 12. Theme picker  (key: t → action: change_theme)
  #     change_theme calls tui.select() with the theme list.
  #     Navigate with arrow keys; cancel with q — since theme picker
  #     has no "Quit" or "Back" labelled item, q calls done(-1) which
  #     cancels without applying and returns to the engine loop.
  # ------------------------------------------------------------------
  log "  nav: Theme picker (t)"
  nav_key "t"
  sleep 1.5   # theme picker may have an intro animation
  capture "theme-picker"
  validate "theme-picker" "theme|Theme|orange|neon|dark|light|colour|color"

  # Cycle through a couple options
  arrow_down
  sleep 0.4
  capture "theme-preview-1"

  arrow_down
  sleep 0.4
  capture "theme-preview-2"

  # Cancel theme picker (q → done(-1), no state change)
  send "q"
  sleep 0.6
  # Belt-and-suspenders
  send Escape
  sleep 0.4

  # ------------------------------------------------------------------
  # 13. Final main menu — confirm clean return from all navigations
  # ------------------------------------------------------------------
  wait_for "What would you like to do" 6
  capture "main-menu-final"
  validate "main-menu-final" "What would you like to do|CC COMMANDER"

  # ------------------------------------------------------------------
  # Quit the TUI cleanly (q on main menu → action: quit)
  # ------------------------------------------------------------------
  log "  nav: Quit (q)"
  if tui_alive; then
    send "q"
    sleep 0.8
  fi
}

# ---------------------------------------------------------------------------
# Phase 3 — Self-contained HTML gallery from all .ansi files
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

// ---------------------------------------------------------------------------
// ANSI SGR -> inline-CSS HTML
// Handles: reset, bold, italic, underline, 3-bit, 8-bit, 24-bit fg/bg.
// ---------------------------------------------------------------------------
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
    // cursor-movement and other CSI sequences are dropped
  }
  return out;
}

// Collect .ansi files sorted numerically by NN- prefix
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
  var body  = ansiToHtml(raw);
  return { filename: filename, label: label, body: body };
});

var toc = cards.map(function(c) {
  return '      <li><a href="#' + c.label + '">' + c.label.replace(/-/g, ' ') + '</a></li>';
}).join('\n');

var cardHtml = cards.map(function(c) {
  var escaped_body = c.body || '<span class="dim">(empty capture)</span>';
  return (
    '\n  <section class="card" id="' + c.label + '">\n' +
    '    <h2>' + c.label.replace(/-/g, ' ') + '</h2>\n' +
    '    <pre class="terminal">' + escaped_body + '</pre>\n  </section>'
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
# Validate that Phase 1 output files exist
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
