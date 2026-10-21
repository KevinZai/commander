Status: done — Kapture feasible as a second browser-MCP (local, origin-gated, OSS) but with unauthenticated shared control plane; recommend pilot only with caveats

# CC-697 slice 1: Kapture read-only feasibility audit (2026-10-21)

Method: GitHub README + source read via `gh api` (server/src/origin-policy.ts, browser-websocket-manager.ts, tab-registry.ts, index.ts). Nothing installed, no config edits, no ports bound, no browser bridge. Tier: no LLM subagents; one light session, scripts/WebFetch only.

## Facts (observed in source)
- Repo williamkapke/kapture, default branch `master`, last push 2026-07-06, 192 stars (ticket said 141), 8 open issues, 277 commits, no GitHub Releases. License: README says MIT, but GitHub API reports no detected license (no LICENSE file in tree) - verify before any redistribution.
- Server binds `127.0.0.1:61822` (HTTP + WS). MCP clients: `ws://localhost:61822/mcp`; extension connects on root `/`. `npx -y kapture-mcp@latest bridge` = stdio<->WS translator, starts server if absent.
- Extension is MV3 service worker using `chrome.debugger` + `chrome.tabs` (DevTools need not be open). Tools: navigate/back/forward/reload, click/hover/fill/type/select/keypress/scroll, elements, console_logs/watch_console, network_monitor/requests/body, evaluate, compose.
- Origin policy: no Origin header (scripts, curl, bridge) is ALLOWED; web origins must be on allow-list (github.io dashboard, localhost:61822, plus `KAPTURE_ALLOWED_ORIGINS`). Extension origin pinned to a single extension ID, accepted only on `/`.
- `evaluate` (arbitrary JS) is off until user enables per-tab "Allow JS execution"; resets on disconnect.
- Protocol: JSON over WS (`register`, `response`, id-correlated commands); not formally documented, readable in source. Default command timeout 5s.

## Multi-client isolation risks
1. **No authentication.** Any local process (any user-space app, any other MCP client) can connect with no Origin and drive every connected tab via WS `/mcp` or the HTTP `POST /tab/{id}/{command}` API. Isolation is per-tab-registry, not per-client.
2. **No client-to-tab ownership/ACL.** Tab IDs are global; every client sees and can act on every connected tab. Notifications broadcast to all clients. Two agents can race on one tab (focus, navigation, form state); no locking observed. This undermines the "3 agents, 3 jobs" pilot unless agents are assigned disjoint tabs by convention.
3. **Data exposure via HTTP GET** (`/tab/{id}/dom`, `/screenshot`, `/console`) to any no-Origin local caller; screenshots/DOM of logged-in sessions (PostHog, admin consoles) are readable locally.
4. **Browser-origin gate relies on allow-list**; `KAPTURE_ALLOWED_ORIGINS` env widens it; the hosted github.io origin is trusted by default (supply-chain surface: that page can talk to localhost server).
5. **Debugger attach** shows Chrome's "being debugged" banner and conflicts with any other debugger client on the same tab (plausible conflict with Claude-in-Chrome or DevTools on the same tab; not tested - runtime check needed).
6. `npx -y kapture-mcp@latest` is an unpinned remote-code fetch each launch; pin a version if ever adopted.
7. Port 61822 is fixed; no conflict with Fleet-reserved 8788/8789/3100.

## Protocol risks
- Undocumented, unversioned message format; extension version field optional ("absent on older extensions") - drift risk on upgrades.
- Network capture starts only after monitoring enabled; SSE bodies unreadable; 5s default timeout.
- Single-maintainer project; ~3.5 months since last push at audit time.

## Fit for the ticket's use cases
- Multi-agent debugging: technically yes, isolation by convention only.
- Cron-driven script (no Claude session): feasible via WS/HTTP, but this is exactly the no-auth path in risk 1; a cron job needs Chrome running with the extension and tab connected (manual user step), so "nightly unattended" is fragile.
- Auditable: yes, source is small and readable.

## Recommendation
Defer pilot (ticket is no-rush). If pursued later: separate Chrome profile with no sensitive logins, pinned `kapture-mcp` version, JS execution left off, empty `KAPTURE_ALLOWED_ORIGINS`, disjoint tab assignment per agent, and a runtime test for coexistence with Claude-in-Chrome (slice 2, needs install approval).

## Not done / limits
No runtime testing (forbidden by scope). Claims about tab racing/locking and debugger conflicts are inferred from source skim, not verified; only 3 source files + index.ts grep were read, not the extension code or tool-handler.
