#!/usr/bin/env node
// Build the web Bible by inlining BIBLE.md into its HTML template shell
// (<script id="bible-source" type="text/markdown"> placeholder, client-side rendered).
//
// NOTE: the shell (bible.html) moved to the PRIVATE marketing repo
// (KevinZai/commanderplugin-com) in 9ba44cc — docs/bible.html no longer exists
// here. Pass the shell path explicitly:
//   node scripts/build-bible.mjs ~/clawd/projects/commanderplugin-com/bible.html
// After building, commit+push that repo (Vercel deploys commanderplugin.com/bible;
// kevinz.ai mirrors it hourly via its sync-bible workflow).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BIBLE_MD = path.join(ROOT, 'BIBLE.md');
const BIBLE_HTML = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'docs', 'bible.html');

if (!fs.existsSync(BIBLE_HTML)) {
  console.error(`Shell not found: ${BIBLE_HTML}`);
  console.error('The bible.html shell lives in the private commanderplugin-com repo — pass its path as the first argument.');
  process.exit(1);
}

const md = fs.readFileSync(BIBLE_MD, 'utf8');
let html = fs.readFileSync(BIBLE_HTML, 'utf8');

// Escape </script> in markdown content (rare but possible)
const safe = md.replace(/<\/script>/gi, '<\\/script>');

// Replace placeholder OR existing content between markdown source tags
const startTag = '<script id="bible-source" type="text/markdown">';
const endTag = '</script>';
const startIdx = html.indexOf(startTag);
if (startIdx === -1) { console.error('No bible-source tag found'); process.exit(1); }
const endIdx = html.indexOf(endTag, startIdx + startTag.length);
if (endIdx === -1) { console.error('No closing script tag'); process.exit(1); }

const before = html.slice(0, startIdx + startTag.length);
const after = html.slice(endIdx);
html = before + safe + after;

fs.writeFileSync(BIBLE_HTML, html);
console.log(`✓ Built ${path.relative(process.cwd(), BIBLE_HTML)} (${(html.length / 1024).toFixed(1)}KB, ${md.split('\n').length} source lines)`);
