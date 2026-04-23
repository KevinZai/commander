#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "Need rsvg-convert. Install: brew install librsvg"
  exit 1
fi
rsvg-convert -w 1200 -h 630 docs/assets/og-image-v4.svg -o docs/assets/og-image-v4.png
echo "✅ Generated docs/assets/og-image-v4.png"
