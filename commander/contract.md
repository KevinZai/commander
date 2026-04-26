# Commander Product Contract

`commander/contract.json` is the public product source of truth for user-facing counts, names, versions, pricing posture, MCP status, and client compatibility.

Update it when the shipped product changes:

- Bump `version` with the release manifests.
- Recount plugin skills, specialist agents, hooks, bundled MCP servers, ecosystem skills, and CCC domains after adding or removing files.
- Update compatibility and hosted MCP status only when the product actually ships or is blocked in a new way.
- Keep public docs aligned by running `npm run check:contract`.

CI runs `node scripts/check-product-contract.js --check` on pull requests. Use `node scripts/check-product-contract.js --report` to see drift without failing, or `node scripts/check-product-contract.js --patch` to fix simple count/version text mismatches before reviewing the remaining manual findings.
