# /ccc-qa edge cases and worked examples

## Edge-case categories

The qa-engineer checks missing tests against these categories first.

| Category | Inputs to test |
|---|---|
| Empty | `""`, `null`, `undefined`, `[]`, `{}` |
| Boundary | `Number.MAX_SAFE_INTEGER`, a 10,000-character string, `0`, `-1`, the exact rate limit |
| Concurrent | two simultaneous writes to the same record |
| Unicode | `"тест@example.com"`, emoji in a username, an RTL string in a user-controlled field |
| Expired state | a token at the exact TTL boundary second, a stale session cookie |
| Overflow | a payload over the server's max body size, a file over the upload limit |

## Worked examples

### Auth refactor, unit lane

```
/ccc-qa unit
```

Vitest detected. 187/187 pass; coverage on `src/auth/*` 74% → 82% (+8). The qa-engineer flags a missing concurrent-session-creation test (🟠 High) and an expired-token-at-boundary test (🟡 Medium). The user picks "Write missing edge-case tests".

### Payment flow, all suites

```
/ccc-qa all
```

Vitest and Playwright detected. Unit 204/210 (6 failing), E2E 12/12, branches −3 (🟠 regression). `POST /checkout` with an empty cart returns 500 instead of 400 (🔴 Critical), so QA is blocked and the ship option is not offered. The user picks "Fix failing tests".

### Migration, flaky audit

```
/ccc-qa flaky
```

Run 1: 145 pass. Run 2: 143 pass, 2 fail. Run 3: 145 pass. `UserSessionManager.test.ts:88` is flagged flaky (🟠 High, race in teardown). The user picks "File issues to Linear" and confirms the issue before it is created.
