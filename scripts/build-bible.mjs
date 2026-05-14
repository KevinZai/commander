#!/usr/bin/env node
// Build docs/bible.html from BIBLE.md
// Inlines markdown source into <script type="text/markdown"> placeholder for client-side rendering.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BIBLE_MD = path.join(ROOT, 'BIBLE.md');
const BIBLE_HTML = path.join(ROOT, 'docs', 'bible.html');

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
console.log(`✓ Built docs/bible.html (${(html.length / 1024).toFixed(1)}KB, ${md.split('\n').length} source lines)`);
