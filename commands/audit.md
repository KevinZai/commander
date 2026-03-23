Run a comprehensive audit of the current project.

Steps:
1. **Dependencies**: `npm audit` / `pnpm audit` — check for vulnerabilities
2. **Bundle size**: Check build output sizes, flag anything >500KB
3. **TypeScript**: `tsc --noEmit` — zero errors required
4. **Dead code**: Scan for unused exports, unreferenced files
5. **Secrets**: Scan for hardcoded API keys, tokens, passwords
6. **ENV vars**: Verify all required env vars are documented and present
7. **CLAUDE.md**: Check if project has a CLAUDE.md — if not, flag as gap

Output format:
```
🔴 Critical: [list]
🟡 Warning: [list]
🟢 Clean: [list]
📊 Score: X/10
```

Args: $ARGUMENTS (optional: "security", "deps", "perf" to run specific audit only)
