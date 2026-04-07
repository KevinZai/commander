# Audit Action Checklist (2026-04-07, v2)

## 1) Fix ESLint Rule Runtime Crash (High)
- [ ] Update `eslint-rules/test-quality.cjs` to support ESLint 10 context API.
- [ ] Replace `context.getSourceCode()` usage with compatible access (`context.sourceCode` fallback pattern).
- [ ] Add unit/smoke test for custom rules to prevent future API drift.
- Verification:
  - `npx eslint . --max-warnings 120`
  - `node -e "const p=require('./eslint-rules/test-quality.cjs'); const r=p.rules['no-unscoped-service-test']; const v=r.create({sourceCode:{getText:()=>''},report:()=>{}}); v.TemplateLiteral({type:'TemplateLiteral',quasis:[],expressions:[]}); console.log('ok');"`

## 2) Stabilize pre-compact Hook Test (Medium)
- [ ] Refactor `tests/hooks.test.js` `pre-compact.js` case to use isolated temp dir (env override) instead of hard `~/.claude/sessions` dependency.
- [ ] Ensure test creates/cleans its own writable session dir.
- [ ] Confirm behavior in sandboxed environments.
- Verification:
  - `node --test tests/hooks.test.js`
  - `npm test`

## 3) Resolve dashboard Vulnerabilities (Medium)
- [ ] Upgrade `dashboard/` dependency chain to remove `vite`/`esbuild` advisories.
- [ ] If major upgrade required, update build config/tests and document migration impact.
- [ ] Re-run audit until vulnerability count reaches zero (or explicitly risk-accept with owner/date).
- Verification:
  - `cd dashboard && npm install`
  - `cd dashboard && npm run build`
  - `cd dashboard && npm audit --json`

## 4) Canonicalize Skill Counting (Medium)
- [ ] Define one canonical metric for “skills” (CLI-visible vs on-disk SKILL.md files).
- [ ] Implement a deterministic counting script and use it in docs/CI.
- [ ] Fix brittle one-liner count command (stdin chunk-safe parsing).
- [ ] Update docs where numeric claims must be exact.
- Verification:
  - `node bin/kc.js --list-skills --json > /tmp/skills-list.json && jq length /tmp/skills-list.json`
  - `find skills -name 'SKILL.md' | wc -l`
  - `node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).length));" < /tmp/skills-list.json`

## 5) Fix Public Number/Version Consistency (Low)
- [ ] Update stale README badges/counters (`vendors`, `tests passing`) to current values.
- [ ] Normalize where UI snippets intentionally show major/minor (`v2.2`) vs exact semver (`v2.2.1`) and label clearly.
- [ ] Add a docs consistency check to CI for known counters.
- Verification:
  - `rg -n "17_Vendors|166_Tests_Passing|v2\.2\b|v2\.2\.1|451 skills|450\+ skills" README.md CLAUDE.md`

## 6) Keep Passing Areas Green (Regression Guard)
- [x] tmux split script shell syntax check passes.
- [x] tmux split/menu no-crash audit passes.
- [x] session-history edge-case rendering path test passes.
- [x] secrets scan passes.
- [x] PII scan passes.
- [x] root/video npm audit clean.
- Verification:
  - `bash -n bin/ccc-split.sh`
  - `node --test commander/tests/tmux-menu-audit.test.js`
  - `node --test commander/tests/paths.test.js`
  - `if grep -rn 'sk-[a-zA-Z0-9]\{20\}\|ghp_[a-zA-Z0-9]\{36\}' --include='*.js' --include='*.json' --include='*.md' --exclude-dir=vendor --exclude-dir=node_modules .; then echo FAIL; else echo PASS; fi`
  - `if grep -rn '6418588155\|1477872497599840369\|1480676421457416306\|d852cff2\|k3v80\|/Users/ai/' --include='*.md' --include='*.js' --include='*.html' --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=coverage --exclude-dir=kevin --exclude-dir=docs --exclude='CHANGELOG.md' .; then echo FAIL; else echo PASS; fi`
  - `npm audit --json`
  - `cd video && npm audit --json`

## 7) Final Validation Gate
- [ ] Run complete re-check after fixes.
- [ ] Confirm score target >= 90 with no High findings.
- Verification:
  - `npm test`
  - `npx eslint . --max-warnings 120`
  - `npm audit --json`
  - `cd dashboard && npm audit --json`
  - `cd video && npm audit --json`
  - `node bin/kc.js --test`
