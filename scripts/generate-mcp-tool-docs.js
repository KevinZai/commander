#!/usr/bin/env node
'use strict';
// Generate the hosted-MCP tool table in mintlify-docs/features/browse-modes.mdx
// from the server's tool registry (apps/mcp-server-cloud/src/tools/index.ts:
// TOOL_NAMES + TOOL_SCHEMAS). The registry is read as text so this runs with
// plain node and no TypeScript toolchain.
//
//   node scripts/generate-mcp-tool-docs.js          rewrite the generated block
//   node scripts/generate-mcp-tool-docs.js --check  exit 1 if the docs drifted

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'apps', 'mcp-server-cloud', 'src', 'tools', 'index.ts');
const DOC = path.join(ROOT, 'mintlify-docs', 'features', 'browse-modes.mdx');
const BEGIN = '{/* BEGIN GENERATED: mcp-tools — run `node scripts/generate-mcp-tool-docs.js`; do not edit by hand */}';
const END = '{/* END GENERATED: mcp-tools */}';

const STRING = /"((?:[^"\\]|\\.)*)"/;

function parseString(literal) {
  return JSON.parse(`"${literal}"`);
}

function sliceBetween(src, startRe, endRe, label) {
  const start = src.search(startRe);
  if (start < 0) throw new Error(`registry: ${label} not found`);
  const rest = src.slice(start);
  const end = rest.search(endRe);
  if (end < 0) throw new Error(`registry: end of ${label} not found`);
  return rest.slice(0, end);
}

function parseRegistry(src) {
  const namesBlock = sliceBetween(src, /export const TOOL_NAMES = \[/, /\]\s*as const;/, 'TOOL_NAMES');
  const names = [...namesBlock.matchAll(/"(commander_[a-z_]+)"/g)].map((m) => m[1]);
  if (names.length === 0) throw new Error('registry: TOOL_NAMES is empty');

  const schemas = sliceBetween(src, /export const TOOL_SCHEMAS[^=]*= \{/, /\n\};/, 'TOOL_SCHEMAS');
  const blurb = src.match(/function searchSkillsBlurb\(\)[\s\S]*?return `([^`]*)`/);

  return names.map((name) => {
    const startRe = new RegExp(`\\n  ${name}: \\{`);
    const start = schemas.search(startRe);
    if (start < 0) throw new Error(`registry: no TOOL_SCHEMAS entry for ${name}`);
    const after = schemas.slice(start + 1);
    const next = after.slice(1).search(/\n {2}commander_[a-z_]+: \{/);
    const block = next < 0 ? after : after.slice(0, next + 1);

    const title = block.match(new RegExp(`title: ${STRING.source}`));
    let description = block.match(new RegExp(`\\n {4}description: ${STRING.source}`));
    description = description ? parseString(description[1]) : null;
    if (!description && /\n {4}get description\(\)/.test(block) && blurb) {
      // Registry-derived at runtime from the live skill count.
      description = blurb[1].replace(/\$\{count\}/g, 'all');
    }
    if (!title || !description) throw new Error(`registry: ${name} is missing a title or description`);
    const required = block.match(/\n {6}required: \[([^\]]*)\]/);
    const args = required ? [...required[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
    return { name, title: parseString(title[1]), description, args };
  });
}

function firstSentence(text) {
  const m = text.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : text).replace(/\|/g, '\\|');
}

function renderBlock(tools) {
  const rows = tools.map((t) => {
    const sig = t.args.length ? `${t.name}(${t.args.join(', ')})` : t.name;
    return `| \`${sig}\` | ${t.title} | ${firstSentence(t.description)} |`;
  });
  return [
    BEGIN,
    `The hosted server exposes **${tools.length} MCP tools** (from \`apps/mcp-server-cloud/src/tools/index.ts\`):`,
    '',
    '| Tool | Title | What the agent does with it |',
    '|------|-------|----------------------------|',
    ...rows,
    END,
  ].join('\n');
}

function applyBlock(doc, block) {
  const b = doc.indexOf(BEGIN);
  const e = doc.indexOf(END);
  if (b < 0 || e < 0 || e < b) throw new Error(`${path.relative(ROOT, DOC)}: generated-block markers missing`);
  return doc.slice(0, b) + block + doc.slice(e + END.length);
}

function main(argv) {
  const tools = parseRegistry(fs.readFileSync(REGISTRY, 'utf8'));
  const doc = fs.readFileSync(DOC, 'utf8');
  const next = applyBlock(doc, renderBlock(tools));
  if (argv.includes('--check')) {
    if (next !== doc) {
      console.error(`DRIFT: ${path.relative(ROOT, DOC)} is out of date with the MCP tool registry (${tools.length} tools). Run: node scripts/generate-mcp-tool-docs.js`);
      return 1;
    }
    console.log(`PASS: browse-modes lists all ${tools.length} MCP tools from the registry`);
    return 0;
  }
  if (next !== doc) fs.writeFileSync(DOC, next);
  console.log(`${next !== doc ? 'Updated' : 'Unchanged'}: ${path.relative(ROOT, DOC)} (${tools.length} tools)`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { parseRegistry, renderBlock, applyBlock, BEGIN, END, REGISTRY, DOC };
