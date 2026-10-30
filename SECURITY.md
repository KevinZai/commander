# Security Policy

## Reporting Vulnerabilities

Email security issues to kevin@kevinz.ai. Do not open public issues for security bugs.

## Environment Variables

CC Commander uses these environment variables (never hardcode):
- `LINEAR_API_KEY_PERSONAL` — Linear API access
- `LINEAR_CC_CLIENT_ID` / `LINEAR_CC_CLIENT_SECRET` — Linear OAuth app

Store them in your secret manager or shell environment.

## Network and privacy switches

The plugin reads no credentials. Its outbound calls and their switches are listed in the README [Data & network](README.md#data--network) section:
- `CCC_TELEMETRY=1` opts in to anonymous usage events (off by default).
- `CCC_CI_TICKER=1` opts in to the CI status lookup through your own `gh` login.
- `CCC_OFFLINE=1` blocks every call Commander makes itself, including the session-start update check.

## Permissions

State files are written with mode 0600 (owner-only).
Configuration files should be 0600 if they contain credentials.
