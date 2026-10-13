# /ccc-review output format

Every audit writes one file: `tasks/reviews/ccc-review-<YYYYMMDD>-<lens>.md`, where `<lens>` is `diff`, `quick`, `security` or `perf`.

```markdown
# CCC Review — <lens> — <YYYY-MM-DD>

**Branch:** <branch> · **Base:** <base> · **Diff:** <X> files / <Y> lines
**Engine:** ccc-deep-review | ccc-audit | built-in /code-review | <agent> (fallback) · **Duration:** <Nm Ns>

## Summary

- <total> findings — <blocking> blocking (CONFIRMED 🔴/🟠)
- Verdict: Approve | Request changes | Needs discussion
- Overall risk: Low | Medium | High

## Findings

Each finding carries a verification verdict: **CONFIRMED** (proved from the code by a verifier other than the finder) or **PLAUSIBLE** (reported, not reproduced — confirm before acting).

### 🔴 Critical (N)
- `path:line` — <issue> — **Verdict:** CONFIRMED|PLAUSIBLE — **Fix:** <one-line fix> — **Why:** <rationale; CWE/OWASP id for security>

### 🟠 High (N)
...

### 🟡 Medium (N)
...

### 🟢 Low (N)
...

### ℹ️ Nit (N)
...

## Next actions

1. <one per CONFIRMED blocker, imperative, with path:line>
2. ...
```

Rules:

- Severity scale is fixed: Critical, High, Medium, Low, Nit. Map workflow severities `critical|high|medium|low|nit` one-to-one.
- Security findings name a CWE id when one applies. Performance findings say whether the impact is estimated or measured.
- Unverified overflow (findings beyond a workflow's per-dimension cap) goes in a final "Unverified" section, never mixed into the severity groups.
