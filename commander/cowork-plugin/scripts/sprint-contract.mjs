#!/usr/bin/env node
// sprint-contract.mjs — write, validate and record the project's sprint contract.
//
//   node sprint-contract.mjs from-plan <plan.md> [--out <path>]
//   node sprint-contract.mjs new --title "<title>" --criterion "<text> :: <check cmd>" [...] [--source <s>] [--out <path>]
//   node sprint-contract.mjs validate [<path>]
//   node sprint-contract.mjs status [<path>]
//   node sprint-contract.mjs record <verdict.json | -> [<path>]
//
// Every command prints one JSON object on stdout. Paths are relative to the
// current directory (the project root); the default contract path is
// tasks/sprint-contract.md. Writing a new contract over an existing one first
// archives the old file under tasks/contracts/. Nothing here touches the network.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  CONTRACT_PATH, criteriaFromPlan, titleFromPlan, renderContract, parseContract,
  validateContract, normalizeVerdict, applyVerdict, archiveName, contractFingerprint,
} from '../lib/sprint-contract.mjs';

function out(obj, code = 0) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  process.exitCode = code;
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function flags(args, name) {
  const vals = [];
  args.forEach((a, i) => { if (a === name && args[i + 1] !== undefined) vals.push(args[i + 1]); });
  return vals;
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'no-git';
  }
}

function gitDirty() {
  try {
    return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').filter((l) => l.trim() && !/\stasks\//.test(l)).length > 0;
  } catch {
    return false;
  }
}

function writeContract(target, text) {
  let archived = null;
  if (fs.existsSync(target)) {
    const prev = parseContract(fs.readFileSync(target, 'utf8'));
    archived = archiveName(prev);
    let n = 2;
    while (fs.existsSync(archived)) archived = archived.replace(/(-\d+)?\.md$/, `-${n++}.md`);
    fs.mkdirSync(path.dirname(archived), { recursive: true });
    fs.renameSync(target, archived);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return archived;
}

function report(target, extra = {}) {
  const parsed = parseContract(fs.readFileSync(target, 'utf8'));
  const v = validateContract(parsed);
  return { path: target, title: parsed.title, status: parsed.status, fingerprint: contractFingerprint(parsed), criteria: parsed.criteria, ...v, ...extra };
}

function main(argv) {
  const [cmd, ...args] = argv;
  if (cmd === 'from-plan') {
    const plan = args[0];
    if (!plan || !fs.existsSync(plan)) return out({ ok: false, errors: [`plan file not found: ${plan}`] }, 1);
    const md = fs.readFileSync(plan, 'utf8');
    const criteria = criteriaFromPlan(md);
    if (!criteria.length) return out({ ok: false, errors: ['plan has no "## Evals — what does done look like?" or "## Acceptance criteria" bullets'] }, 1);
    const target = flag(args, '--out') || CONTRACT_PATH;
    const archived = writeContract(target, renderContract({ title: titleFromPlan(md), source: path.basename(plan), criteria }));
    const r = report(target, { archived });
    return out(r, r.ok ? 0 : 1);
  }
  if (cmd === 'new') {
    const title = flag(args, '--title');
    const criteria = flags(args, '--criterion').map((c) => {
      const [text, check] = c.split(/\s+::\s+/);
      return { text: text.trim(), check: check ? check.trim() : null };
    });
    if (!title || !criteria.length) return out({ ok: false, errors: ['new needs --title and at least one --criterion'] }, 1);
    const target = flag(args, '--out') || CONTRACT_PATH;
    const archived = writeContract(target, renderContract({ title, source: flag(args, '--source') || 'manual', criteria }));
    const r = report(target, { archived });
    return out(r, r.ok ? 0 : 1);
  }
  if (cmd === 'validate') {
    const target = args[0] || CONTRACT_PATH;
    if (!fs.existsSync(target)) return out({ ok: false, exists: false, errors: [`no contract at ${target}`] }, 1);
    const r = report(target);
    return out(r, r.ok ? 0 : 1);
  }
  if (cmd === 'status') {
    const target = args[0] || CONTRACT_PATH;
    if (!fs.existsSync(target)) return out({ exists: false, path: target });
    const parsed = parseContract(fs.readFileSync(target, 'utf8'));
    const head = gitHead();
    const fingerprint = contractFingerprint(parsed);
    const verifiedHead = (parsed.verified || '').match(/ at (\S+) \(/);
    const verifiedFp = (parsed.verified || '').match(/ · contract ([0-9a-f]+)/);
    // Current only when verified at this commit, for this exact contract, with a clean tree.
    const current = parsed.status === 'verified' && verifiedHead && verifiedHead[1] === head
      && verifiedFp && verifiedFp[1] === fingerprint && !gitDirty();
    return out({ exists: true, path: target, title: parsed.title, status: parsed.status, verified: parsed.verified, head, fingerprint, current: !!current, criteria: parsed.criteria.length });
  }
  if (cmd === 'record') {
    const src = args[0];
    const target = args[1] || CONTRACT_PATH;
    if (!src) return out({ ok: false, errors: ['record needs a verdict JSON file or - for stdin'] }, 1);
    if (!fs.existsSync(target)) return out({ ok: false, errors: [`no contract at ${target}`] }, 1);
    let verdict;
    try {
      const raw = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8');
      const m = raw.match(/\{[\s\S]*\}/);
      verdict = JSON.parse(m ? m[0] : raw);
    } catch (e) {
      return out({ ok: false, errors: [`verdict is not JSON: ${e.message}`] }, 1);
    }
    const md = fs.readFileSync(target, 'utf8');
    const parsed = parseContract(md);
    const fingerprint = contractFingerprint(parsed);
    const head = gitHead();
    // The report must be for this contract and this revision; otherwise nothing is recorded.
    const errors = [];
    if (!verdict || verdict.fingerprint !== fingerprint) {
      errors.push(`report fingerprint ${JSON.stringify(verdict && verdict.fingerprint)} does not match this contract (${fingerprint}); re-run the verifier on ${target}`);
    }
    // The full 40-character SHA, compared exactly: a prefix or a look-alike is not this commit.
    const rh = verdict && typeof verdict.head === 'string' ? verdict.head : '';
    if (!/^[0-9a-f]{40}$/.test(head) || rh !== head) {
      errors.push(`report head ${JSON.stringify(rh || null)} is not the full current HEAD (${head}); re-run the verifier at this commit with \`git rev-parse HEAD\``);
    }
    if (errors.length) return out({ ok: false, path: target, head, fingerprint, errors }, 1);
    const normalized = normalizeVerdict(parsed, verdict);
    fs.writeFileSync(target, applyVerdict(md, normalized, { head, fingerprint }));
    return out({ ok: true, path: target, head, ...normalized }, normalized.verdict === 'PASS' ? 0 : 2);
  }
  return out({ ok: false, errors: ['usage: sprint-contract.mjs from-plan|new|validate|status|record'] }, 1);
}

main(process.argv.slice(2));
