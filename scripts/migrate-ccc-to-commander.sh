#!/usr/bin/env bash
# CC Commander — one-time migration from legacy "ccc-marketplace" to "commander-marketplace"
# Safe to re-run. Creates timestamped backup before touching anything.
#
# Why this script: v3.0.0 used marketplace slug "ccc-marketplace" + plugin slug "ccc".
# v3.0.1+ renamed both to "commander-marketplace" + "commander". Users who installed v3.0.0
# have the old registration stuck in ~/.claude/plugins/ state and can't `/plugin update`
# the old one because Claude Code looks up plugins by slug.
#
# This script removes the old registration + cached artifacts in 5 places:
#   1. ~/.claude/plugins/known_marketplaces.json       — marketplace registry
#   2. ~/.claude/plugins/installed_plugins.json        — installed plugin list
#   3. ~/.claude/plugins/marketplaces/ccc-marketplace/ — marketplace content
#   4. ~/.claude/plugins/cache/ccc-marketplace/        — plugin cache
#   5. ~/.claude/plugins/.install-manifests/ccc@ccc-marketplace.json — install record
#
# After running: `/plugin marketplace add KevinZai/commander` + `/plugin install commander`
# in Claude Code Desktop to register the new one.

set -euo pipefail

BOLD=$(tput bold 2>/dev/null || echo ""); RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo ""); YELLOW=$(tput setaf 3 2>/dev/null || echo "")
info()  { echo "${BOLD}${GREEN}✅${RESET} $*"; }
warn()  { echo "${BOLD}${YELLOW}⚠️${RESET} $*"; }

PLUGINS_DIR="${HOME}/.claude/plugins"
if [[ ! -d "$PLUGINS_DIR" ]]; then
  warn "No Claude Code plugin directory at $PLUGINS_DIR — nothing to migrate. Exiting."
  exit 0
fi

BACKUP="${HOME}/.claude/backups/plugin-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
[[ -f "$PLUGINS_DIR/known_marketplaces.json" ]] && cp "$PLUGINS_DIR/known_marketplaces.json" "$BACKUP/"
[[ -f "$PLUGINS_DIR/installed_plugins.json"  ]] && cp "$PLUGINS_DIR/installed_plugins.json"  "$BACKUP/"
[[ -d "$PLUGINS_DIR/.install-manifests"      ]] && cp -r "$PLUGINS_DIR/.install-manifests" "$BACKUP/"
info "Backup: $BACKUP"

# Remove from JSON registries via python3 (present by default on macOS + most Linux)
python3 <<PY
import json, os
plugins_dir = os.path.expanduser('~/.claude/plugins')
changes = []

for fname, key_path in [
    ('known_marketplaces.json', ['ccc-marketplace']),
    ('installed_plugins.json',  ['plugins', 'ccc@ccc-marketplace']),
]:
    p = os.path.join(plugins_dir, fname)
    if not os.path.exists(p):
        continue
    with open(p) as f:
        d = json.load(f)
    ref = d
    for k in key_path[:-1]:
        ref = ref.get(k, {})
    if isinstance(ref, dict) and ref.pop(key_path[-1], None) is not None:
        changes.append(fname)
        with open(p, 'w') as f:
            json.dump(d, f, indent=2)

if changes:
    print('  removed from:', ', '.join(changes))
else:
    print('  (no ccc-marketplace entries found in JSON registries)')
PY

# Remove filesystem artifacts
REMOVED=0
for path in \
  "$PLUGINS_DIR/marketplaces/ccc-marketplace" \
  "$PLUGINS_DIR/cache/ccc-marketplace" \
  "$PLUGINS_DIR/.install-manifests/ccc@ccc-marketplace.json"; do
  if [[ -e "$path" ]]; then
    rm -rf "$path"
    REMOVED=$((REMOVED + 1))
  fi
done
info "Filesystem artifacts removed: $REMOVED"

# Verify clean
LEFTOVER=$(ls "$PLUGINS_DIR/marketplaces/" 2>/dev/null | grep -cE "^ccc" || true)
if [[ "$LEFTOVER" -eq 0 ]]; then
  info "ccc-marketplace fully purged"
else
  warn "Some ccc-* artifacts remain — check $PLUGINS_DIR/marketplaces/"
fi

cat <<'DONE'

🎯 Next steps — in Claude Code Desktop (new session):

  /plugin marketplace add KevinZai/commander
  /plugin install commander
  /plugin list | grep commander    # expect: commander  4.0.0-beta.3  Kevin Zicherman

If you need to roll back this migration:
  ls ~/.claude/backups/plugin-cleanup-*/
  # copy the files back to ~/.claude/plugins/
DONE
