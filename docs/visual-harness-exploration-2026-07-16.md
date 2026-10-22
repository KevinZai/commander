# Visual Harness Exploration — Decision Doc

**Date:** 2026-07-16 · **Scope:** proactivity + "should CCC become a visual product" · **Status:** decided, ready to execute

---

## 1. The Call

**Ship the proactivity upgrades inside the existing plugin now — no new product, no new app, no new company surface.** All three independent judge panels (feasibility/maintenance, beginner-experience, and strategy/distribution) ranked the same shape #1 — **In-Desktop visual layer** — and its own adversarial critique converges on the same conclusion from the opposite direction: keep the AUQ-chip and markdown-footer improvements, drop the unverified Artifact status-card. ReadyIQ stays a narrow, one-directional content bridge exactly as the prior 2026-07-10 Option-C eval decided — this exploration found no new evidence strong enough to reopen that call, and two independent judge panels (strategy, beginner) flag paths that would reopen it (saas-web, mac-app) as actively harmful to distribution, not neutral.

---

## 2. What Is Actually Possible

### 2.1 Capability table (evidence-cited)

| Capability | Possible? | Evidence | Label |
|---|---|---|---|
| Plugin skill emits an AskUserQuestion (AUQ) chip picker | ✅ Yes | `code.claude.com/docs/en/agent-sdk/user-input`; live in all 77 CCC skills | **observed** |
| Plugin renders a persistent sidebar/panel it fully controls | ❌ No | Plugin manifest schema has 9 component types, none is a UI-surface type; `claude.com/docs/cowork/guide/plugins` | **observed** (by omission, 3 sources) |
| Fenced ` ```html ` artifact renders interactive on **Cowork Desktop** | ❌ No | CCC's own `commander/cowork-plugin/lib/menu-render.js:1-16` dev note — renders as literal code, feature already shelved once | **observed** (project-internal test) |
| Fenced ` ```html ` artifact renders interactive on **Chat tab / claude.ai** | ✅ Yes | Same CCC note + general Artifacts help docs | **observed** / inferred |
| Publish a real interactive HTML page from a Code/Cowork session (newer "Claude Code Artifacts" feature) | ✅ Yes, but **out-of-band** — opens a separate browser tab to a claude.ai URL, not embedded | `claude.com/blog/artifacts-in-claude-code`, `support.claude.com/…/publish-and-share-artifacts` | **observed** (mechanism) |
| That published Artifact page can call back into the originating chat session | ❌ Not documented | Artifact tool's own schema has no chat-return channel | **observed** (absence in spec) |
| That Artifact feature is reachable from Kevin's/a real user's actual Cowork Desktop plan tier | ❓ Unknown — docs say "beta, Team/Enterprise" | — | **assumed – unverified, SPIKE REQUIRED** |
| `mcp__visualize__show_widget`'s `sendPrompt()` click-to-chat bridge generalizes to a normal installed `commander` skill | ❓ Unknown — only confirmed present in this orchestration harness | — | **assumed – unverified, SPIKE REQUIRED** |
| Chrome extension can overlay/read the Claude **Desktop app** | ❌ No | Electron app = separate OS process, not a browser tab | **inferred** (standard extension-model constraint) |
| Chrome extension can overlay claude.ai **in a browser tab** | ✅ Yes | ReadyIQ's own working `chrome-extension/manifest.json` (`<all_urls>` content script) | **observed** |
| Native macOS app can screen-read/click Claude Desktop via Accessibility API | ✅ Technically yes | Electron-architecture finding (3rd-party corroborated, incl. Boris Cherny/HN quote) + `computer-use` MCP proves the mechanism class works today | **observed** (mechanism) / inferred (generalizes to a bespoke app) |
| Local MCP server can push UI or notify the user proactively without being called | ❌ No | `claude.com/docs/connectors/building/mcp.md` — Tools/Resources/Prompts are request/response only | **observed** |
| Background `monitors/monitors.json` can push text into the *next* session's context unprompted | ✅ Yes (text only, never UI) | Official plugins doc | **observed** |
| Reusing Free/Pro/Max OAuth session in a separate companion app | ❌ Likely ToS violation | Secondary reporting of Consumer ToS — primary text not yet pulled | **inferred — verify against primary ToS before acting** |
| CCC's suggestion engine (`suggest-ticker.js`/`confidence.mjs`) is a search/ranking engine over the skill catalog | ❌ No — it's a fixed ~10-branch if/else table, stack-hints capped below the surfacing gate | `commander/cowork-plugin/hooks/lib/confidence.mjs:24-104,93` | **observed** |
| Repeated tool failures are read back into any suggestion logic today | ❌ No — `tool-failures.jsonl` is write-only, nothing reads it | `hooks/post-tool-failure-logger.js:13,34` + repo-wide grep | **observed** |
| `/ccc-prompt-fix` is proactively wired to any hook | ❌ No — on-demand skill only | `hooks/hooks.json` (no reference) | **observed** |
| Claude Cowork already ships "point a folder → outcome-oriented prompt → live progress" natively | ✅ Yes, today, to a larger audience than CCC has | TechCrunch 2026-07-07; `support.claude.com/…/get-started-with-claude-cowork` | **observed** (direct fetch) |
| Cowork has a native proactive skill-suggestion feature today | ❌ No — guidance is manual ("ask Claude which tasks you do most often") | `claude.com/blog/best-practices-for-getting-started-with-claude-cowork` (direct fetch) | **observed** |
| Cowork's plugin/skill/hook system is compatible with claude.ai / Cowork surfaces, in principle | ✅ Yes, per docs | `claude.com/docs/cowork/3p/extensions` | **observed** (doc-level; not yet tested against CCC's specific hook contract) |

### 2.2 UNVERIFIED — needs a spike before betting

1. **Does the "Claude Code Artifacts" publish-to-URL feature actually work from inside a real Cowork Desktop session with `commander` installed, on Kevin's real account tier?** Highest-leverage unknown for any visual-dashboard ambition — determines whether CCC gets *any* surface beyond AUQ chips + text.
2. **Does `mcp__visualize__show_widget` (with `sendPrompt()`) exist as a general Cowork/Code capability, or is it specific to this orchestration harness?** If it generalizes, it changes the whole design conversation; if not, it's a red herring.
3. **Primary-source text of Anthropic's Consumer ToS on OAuth-token scope and on automating Anthropic's own apps** — everything cited above is secondary reporting, not the ToS document itself.
4. **Whether the "Cowork Desktop" CCC tested (beta.7-era, artifact non-interactive) is the same surface as today's Cowork tab** — the product has visibly been restructured since; the literal-code finding may be stale.
5. **Whether Claude Desktop writes agent output through an ordinary, third-party-observable filesystem path**, vs. a sandboxed/scoped container — load-bearing for any native-overlay "watch the folder" design; never confirmed either way.
6. **claude.ai's DOM selector stability** — no audit was performed; a browser-extension bet is unpriced without this.
7. **Whether non-coder/SMB usage of Claude concentrates in the installed Desktop app or the claude.ai browser tab** — load-bearing assumption for any browser-extension shape; no traffic-split data exists anywhere in the ground truth.
8. **ReadyIQ's scorecard-funnel traffic volume** — cited as a live, working funnel, but no number appears anywhere in the ground truth. "Exists" and "big enough to justify eng-weeks riding it" are different claims.

---

## 3. The Four Shapes

**🥇 In-Desktop visual layer** — *Verdict: VIABLE-IF (strip the Artifact card).* Extends the existing hook pipeline (`suggest-ticker.js`, `confidence.mjs`, `suggest-lightweight.js`) with three real signal fixes (stuck-loop detection from `tool-failures.jsonl`, lightweight `/ccc-prompt-fix` in the prompt-regex pass, `dismissed[]` engagement tracking ported to the default path) plus an ambitious "mission-control status card" rendered via the newer Artifacts-publish-to-URL mechanism. Zero new runtimes, fully reversible (a `git revert`), and the ambitious half is cleanly severable. **Fatal-flaw-if-unconditioned:** the entire "visual product" half rests on one `assumed-unverified`, plan-tier-gated capability (§2.2 item 1) that the design's own §8 admits collapses the pitch back to exactly what CCC ships today if it fails — and even if it works, the card opens in a disconnected browser tab with no chat-return channel, a confusing two-surface UX for a non-coder.

**Native macOS overlay companion** — *Verdict: FATAL.* A Swift/SwiftUI menu-bar app that FSEvents-watches a user-designated project folder and surfaces a hotkey pill with copy-to-clipboard prompt suggestions — deliberately never touches Claude Desktop's window or OAuth, staying on the safe side of the ToS line. **Fatal flaw:** it's a weaker, external, permission-gated copy of Cowork's own native "point a folder, watch progress" metaphor, built in a toolchain (Swift/Xcode/notarization) that shares zero code or CI with the rest of CCC, adds real alt-tab friction to the beginner loop it claims to simplify, does nothing for CCC's actual bottleneck (distribution), and rests on an unverified premise (§2.2 item 5) that could make the whole mechanism inert on day one.

**Web SaaS harness (ReadyIQ-combined)** — *Verdict: FATAL.* Hosts a chat + progress UI on ReadyIQ's existing Clerk/Neon/Stripe chassis, server-side Claude orchestration, and a net-new pgvector skill-ranking pipeline that genuinely closes CCC's "no relevance engine" gap — but only inside a private, closed product. **Fatal flaw:** by its own one-directional, invisible-sync architecture it *cannot* fix CCC's discovery problem even in principle (ReadyIQ users never see CC Commander, never star it); it rebuilds, with a fraction of Anthropic's resources, a product Anthropic already ships to the identical audience; and its core architecture is internally contradictory about whether it needs the currently-HELD hosted-MCP (PR #44) live at all.

**Browser-extension overlay** — *Verdict: VIABLE-IF (reframe honestly, spike first).* A claude.ai-only sidebar (forked from ReadyIQ's existing extension chassis) that reads composer/transcript DOM and offers plain-English prompt-fill cards for an SMB skill subset, with genuinely good anti-nag and "always-fresh" mechanics (a small public unauthenticated JSON manifest, polled independently of code releases — the single best idea across all four shapes). **Fatal-flaw-if-unconditioned:** cannot reach Claude Desktop at all (confirmed, Electron ≠ browser tab) — meaning it answers a materially smaller question than the brief asked; rests on an unaudited, unversioned DOM dependency Anthropic can break with any frontend redesign; and by design it grows ReadyIQ's funnel with zero attribution back to CC Commander, so even success doesn't touch the actual bottleneck.

---

## 4. The Recommendation

**Build nothing new as a product. Deepen the plugin CCC already ships, and treat the visual-product idea as answered — no, not now — by the evidence gathered today.**

Reasoning, stacked:
- **Unanimous judge convergence is rare and should be trusted.** Feasibility, beginner-experience, and strategy panels each reasoned from a different value system (engineering risk, non-coder usability, brand/distribution) and landed on the same #1 independently. That's a stronger signal than any single panel's score.
- **Every visual-product shape's differentiator sits on an unverified or platform-fragile foundation** (Artifacts plan-gating, Desktop's filesystem sandboxing, claude.ai's DOM stability, or a hosted-MCP dependency that's explicitly HELD). None of the four shapes can promise "always one step ahead" without first betting weeks of engineering on something nobody has confirmed works.
- **Prior-art research (fetched directly, not inferred) already answered the "should CCC become a visual harness" question**: Claude Cowork is Anthropic's own current-quarter answer to almost exactly this brief, targeting the same non-coder audience, with 1.2M+ sessions of usage telemetry CCC will never have. Its own confidence estimate: ~25% there's a durable standalone opportunity here at all — and its explicit recommendation is to distribute CCC's suggestion mechanism *into* Cowork/Code as a plugin, not build a competing surface.
- **Distribution — CCC's real, named bottleneck (5 stars, 0 forks) — is untouched or actively worsened by three of the four shapes.** mac-app and saas-web add a *second*, harder discovery problem on top of the unsolved first one. browser-ext solves distribution for ReadyIQ, not CCC. Only in-desktop is distribution-neutral: it improves retention for people who already found CCC, which is honest, bounded value — not a growth lever.

**The strongest counter-case, named honestly:** Cowork's own onboarding docs confirm a real, currently-unserved gap (no proactive skill-suggestion — guidance today is "ask Claude what you do most often"). CCC already has the only working mechanism anywhere in this research that closes that exact gap (`suggest-ticker.js` + AUQ chips), and Anthropic is structurally best-positioned to close it themselves within "1-2 releases" per the priorart's own inference. **If that happens, in-desktop's whole value proposition becomes redundant with the host platform — not broken, but moot, and CCC will have spent real effort narrowing a gap Anthropic closes for free.** This is a real risk and the honest fallback is explicit: because in-desktop's changes are all local hook-file diffs with zero new runtime, the downside if this plays out is a few weeks of opportunity cost — not stranded infrastructure, not a churned install base, not a second toolchain. That asymmetry (small downside, real but bounded upside, zero downside for the mac-app/saas-web/browser-ext alternatives which all have expensive, non-recoverable downside) is what makes this the right call, not a certainty that the upside materializes.

---

## 5. The First Shippable Slice

**Ship only the confirmed-available half of the in-desktop shape — no Artifact/status-card dependency, no spike required first.** This is small, reversible, and valuable on its own even if CCC never builds anything more ambitious:

| Item | Est. | Confirmed-available? |
|---|---|---|
| Wire `tool-failures.jsonl` into `computeState()` — 2+ failures on same file/tool in a session → bump `recommendedLevel`, surface a plain-language "this isn't working, want me to try differently?" chip | 2-3 days | Yes — pure JS, existing file already logs this, nothing reads it today |
| Wire a lightweight (2-3 check) subset of `/ccc-prompt-fix` into `suggest-ticker.js`'s existing prompt-regex pass | 2-3 days | Yes — additive to code that already does this class of thing (ultracode/isolation keyword detection) |
| Port `dismissed[]` engagement tracking from loop-mode to the default `suggest-lightweight.js` path, so ignored suggestions stop repeating | 2 days | Yes — pattern already proven in loop-mode |
| Merge `context-guard.js` + `context-warning.js` into one hook, one threshold table | 1-2 days | Yes — confirmed redundant/uncoordinated today |
| **Total** | **~1.5-2 eng-weeks**, zero spikes, zero new runtime | |

Everything here is a `git revert`-away if wrong. No Artifact-tool dependency, no plan-tier gate, no new manifest primitive. **Explicitly deferred, not built:** the status-card, `monitors/monitors.json` version-drift watcher, and the manifest-decoupling mechanism — all real ideas (see §6), but each adds either a spike dependency or a new primitive CCC hasn't used before, and none is required for this slice to ship value.

---

## 6. Proactivity Upgrades (ship now, independent of product shape)

This is the highest-confidence value in the whole doc — every item below needs no product decision, no spike, and is directly backed by the proactivity ground-truth audit's own gap findings.

1. **Wire `tool-failures.jsonl` into the suggestion engine.** Today it's a write-only log nobody reads (`post-tool-failure-logger.js` — confirmed by repo-wide grep). 2+ failures on the same tool/file in a session is the single clearest "beginner is stuck" signal CCC currently cannot see. *(Gap #3 in the proactivity audit, ranked its #2 highest-leverage fix.)*
2. **Wire a lightweight `/ccc-prompt-fix` pass into the ambient ticker.** The one skill purpose-built for non-coders exists, works, and is never proactively offered — it's on-demand only, not in `hooks.json`. *(Audit's #4 highest-leverage fix; this is the most beginner-relevant single change on this list.)*
3. **Add zero-verification-activity detection.** `testsStatus` defaults to and stays `unknown` forever unless a test command happens to run — meaning "never runs tests" produces *no signal at all*, the exact beginner failure mode most worth catching. Detect via `git diff --stat` on source changes with no matching verification activity over N turns. *(Audit's #2 highest-leverage fix.)*
4. **Merge `context-guard.js` and `context-warning.js`.** Two independently-computed, uncoordinated context-percentage warnings can fire conflicting messages in the same turn — pure noise reduction, frees a hook slot. *(Audit's #5 finding.)*
5. **Port `dismissed[]` suggestion-tracking to the default ambient path.** Today only loop-mode remembers what a user ignored; the default path re-shows the same suggestion indefinitely. For a beginner audience prone to "wall of stuff I don't understand" abandonment, this matters more than for developers. *(Audit's finding #3, "no signal on whether the user engaged.")*
6. **(Stretch, still zero-spike) Ship the manifest-decoupling mechanism as a `monitors/monitors.json` component** — a small, public JSON file mapping phrase/skill relevance, synced on a schedule from CCC's own skill markdown (same pattern as ReadyIQ's own `scripts/ccc-sync.ts`, already proven). This is the one mechanical answer, anywhere in the four shapes' worth of research, to "always up-to-date relevant skills" that doesn't require an embeddings engine, a held PR, or a second product — it just needs CCC to build it for itself instead of for a browser extension. All three judge panels independently flagged this as the best idea worth stealing from a losing shape.

**Explicitly not on this list, and why:** an embeddings/semantic-search ranking engine over the full 77+467 skill catalog. Confirmed absent today (`confidence.mjs` is a fixed ~10-branch table, stack-hints capped below the surfacing gate) and genuinely out of scope for a "ship now, no spike" list — it's real, future-worthy work, but it's a multi-week build, not a proactivity fix.

---

## 7. The ReadyIQ Question

**Verdict: bridge, narrowly — do not combine, do not build the deeper SaaS integration.** This confirms, not reopens, the prior 2026-07-10 Option-C eval.

**Confronting the decision directly:** the eval chose a live MCP bridge over a merge specifically to protect three things — the 3-brand funnel (kevinz.ai personal / CC Commander MIT OSS / ReadyIQ consumer), the MIT-vs-commercial licensing boundary, and (implicitly) CCC's "core free forever" credibility. Nothing surfaced in this research weakens that reasoning; two things strengthen it:

- **The licensing boundary is real and already load-bearing, not hypothetical.** CC Commander is MIT, "core free forever" per its own CLAUDE.md. ReadyIQ is `private: true` in `package.json`, four paid Stripe tiers up to $999/mo. PR #453's own sync-script header comment explicitly names "Option C from the 2026-07-10 eval" as the reasoning behind its one-directional, regeneratable-sync architecture — this was already adjudicated once, by the same team, and the architecture in flight already reflects that adjudication.
- **A live, current, operational signal says the two systems don't compose cleanly today, independent of the product question.** ReadyIQ's own workspace config (`.agent/CLAUDE.md:24`) currently *disables* the `commander` plugin — "its plan-mode skills hard-fail in this surface." That's not a hypothetical risk to weigh; it's the team's own dev environment telling them, right now, don't tighten this coupling yet.

**What's already built and safe to keep as-is:** ReadyIQ PR #453's Slice 1 (build-time skill-content sync — 22 personas, 45 templates, local filesystem read, no network call) is exactly the "bridge" pattern this doc endorses — offline, one-directional, MIT content flows as data, CCC's repo/license/identity untouched. **What should stay held:** Slice 2's `cccSkills` population and the `CCC_MCP_KEY` auth-model decision, both of which are explicitly gated on the currently-HELD hosted-MCP work (PR #44) — this doc does not recommend unholding that, and no shape evaluated here requires it to ship.

**What this doc explicitly rejects, and why:** the saas-web shape's deeper integration (server-side orchestrator, live hosted-MCP tool-calling, shared vector index) — because by its own one-directional architecture it cannot move CCC's discovery numbers even if built successfully, while it does put MIT content functionally behind a paid consumer product, reopening exactly the optics tension the prior eval was designed to avoid. If Kevin later wants ReadyIQ to drive CCC distribution specifically (not just consume its content), that needs to be a named, separate decision — with visible attribution back to CC Commander built into the design from day one — not a byproduct of a feature built for a different reason.

---

## 8. Open Questions / Spikes

| # | Question | Cheapest experiment | Blocks |
|---|---|---|---|
| 1 | Does the Artifacts publish-to-URL mechanism actually render/update from an installed `commander` skill in a real Cowork Desktop session, on Kevin's account tier? | In a live (non-harness) Cowork Desktop session, have a `commander` skill call the `Artifact` tool once and observe success/gate/absence. ~1 day. | Any future revival of the status-card idea (§3, in-desktop) |
| 2 | Does `mcp__visualize__show_widget`'s `sendPrompt()` exist in a normal Cowork/Code session outside this harness? | Check for `mcp__visualize__*` availability in a bare `claude` CLI session with no special orchestration wrapper. ~30 min. | Whether a genuinely better inline-interactive primitive exists at all |
| 3 | What does Anthropic's Consumer ToS actually say about OAuth-token scope and automating Anthropic's own apps? | Fetch `privacy.claude.com` / `anthropic.com` ToS pages directly, quote the operative clause verbatim. ~30 min. | Any future native-overlay or companion-app idea (currently correctly avoided) |
| 4 | Is CCC's stale "Cowork Desktop renders artifacts as literal code" finding (beta.7-era) still true on today's restructured Chat/Cowork/Code tabs? | Re-test a fenced ` ```html ` block in a live Cowork session today. ~15 min. | Confidence level on the whole "Cowork Desktop non-interactive" claim |
| 5 | Does Claude Desktop write agent output through a plain, third-party-observable filesystem path? | Not worth spiking — mac-app shape is FATAL regardless; only relevant if that verdict is ever revisited. | Any future native-overlay concept |
| 6 | Is claude.ai's composer/message DOM built on stable, semantically-anchored selectors (`data-testid`) or volatile utility classes? | A 1-hour manual DOM audit of the composer and message-bubble markup in a live claude.ai tab. | Whether browser-ext could ever flip above in-desktop per the feasibility judge's stated flip-condition |
| 7 | Does non-coder/SMB Claude usage concentrate in the installed Desktop app or the claude.ai browser tab? | Check ReadyIQ's own analytics for referrer/user-agent patterns among scorecard completers who later mention "Claude" — informal, ~1 day, no new instrumentation needed. | Whether browser-ext answers the actual brief's audience at all |
| 8 | Does ReadyIQ's scorecard funnel have enough traffic to justify riding it for any future distribution bet? | Pull the existing funnel-conversion numbers ReadyIQ already tracks (lead capture → scorecard completion counts). ~30 min, data already collected. | Any future decision to deepen ReadyIQ as a CCC distribution channel |

---

*Ground truth sources: proactivity inventory (`commander/cowork-plugin/hooks/*`), Desktop surface capability audit (official Anthropic docs, fetched 2026-07-16), ReadyIQ codebase read (`README.md`, `.agent/CLAUDE.md`, `docs/ccc-bridge.md` on `feat/ccc-live-bridge`, PR #453), prior-art competitive research (Cowork, Lovable/Bolt/v0/Replit/Gumloop/n8n, Raycast, Cluely — all fetched 2026-07-16). Four shape designs + adversarial critiques + three independent judge panels (feasibility, beginner, strategy) synthesized above.*
