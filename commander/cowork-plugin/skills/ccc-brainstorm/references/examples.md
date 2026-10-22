# /ccc-brainstorm — worked examples

## Auth strategy

```
/ccc-brainstorm "auth strategy for a B2B SaaS — Clerk, Auth.js, or roll my own JWT?"
```

- Path A (simple): roll your own JWT. Few moving parts, no vendor lock-in, about 4 hours to ship.
- Path B (scalable): Clerk. Hosted, grows to SSO/SAML through one SDK, about 30 minutes to ship.
- Path C (delight): Clerk with magic links. Passwordless, branded email, low-friction login.

The matrix shows Clerk is easy to reverse (eject later), Auth.js needs infrastructure, and custom JWT carries medium security risk. The user picks Path B. Decision block: "Chosen: Clerk. Tradeoff: a monthly fee instead of maintaining auth. Next: /ccc-plan."

## Database for a low-traffic personal tool

```
/ccc-brainstorm "Postgres, SQLite, or Turso for a low-traffic personal tool?"
```

- Path A: SQLite. Single file, zero ops, works locally and on a single host with replication add-ons.
- Path B: Postgres on a managed host. Standard, row-level security, clear growth path.
- Path C: Turso. Edge-replicated SQLite, good developer experience, fast global reads.

Reversibility: SQLite easy (file copy is a backup), Postgres medium, Turso medium.

## Design system for a dashboard

```
/ccc-brainstorm "shadcn/ui vs Radix primitives vs Tailwind UI for a dashboard"
```

- Path A: shadcn/ui. Copy-paste components, no runtime dependency, full ownership.
- Path B: Radix primitives. Headless, accessible, maximum customization.
- Path C: Tailwind UI. Polished designs under a paid license; fastest route to a good-looking product.
