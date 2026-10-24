# Node.js runtime requirements

The CLI and local plugins support `^20.19.0 || >=22.12.0`. The root `package.json` and `package-lock.json` root entry declare this range; product release versions are independent.

| Evidence | Effect on the minimum |
| --- | --- |
| Root `package-lock.json` and installed runtime packages: `figlet@1.11.4` requires Node >=17 and depends on `commander@14.0.3`, which requires >=20 | Node 18 cannot satisfy the shipped dependency tree. |
| `scripts/build-codex.js` and `commander/cowork-plugin/lib/*.js` mix ESM `.js` files with CommonJS under a root package without `type` | Requires automatic module syntax detection. |
| `commander/tests/suggest-lightweight.test.js` and `proactivity-wave.test.js` use `require()` on ESM hooks | Requires unflagged `require(esm)`. Node [20.19.0](https://nodejs.org/en/blog/release/v20.19.0) enables both features by default; Node [22.12.0](https://nodejs.org/en/blog/release/v22.12.0) enables `require(esm)`. Earlier 22.x and Node 21 are excluded. |
| `hooks/_archive/session-start.js` uses `import.meta.dirname`; hooks use `fetch` and `AbortSignal.timeout`; tests use `node:test`, `--test-reporter`, and `fs.cp` | These APIs are available by the declared floor. Optional `node:sqlite` is feature-detected in `lib/memory-reader.js`, so it does not raise the minimum. |
| `.github/workflows/ci.yml` validates the root on Node 22; `release.yml` uses 22; `refresh-stats.yml` uses 20 | CI pins are compatible with the root's declared range when using the current minor in each major. CI does not test the exact minimum versions. |

> **Cloud MCP follow-up:** The cloud MCP package is separately deployed, with CI on Node 24. Its `package-lock.json` records Supabase requiring `>=22.0.0` and `posthog-node` requiring `^20.20.0 || >=22.22.0`; their intersection means the package effectively needs Node `>=22.22.0`. Its `package.json` and lockfile root entry still declare `>=18.0.0`. Raise the cloud manifest floor and matching lockfile entry in a separate PR.

Validation for the routing fix ran on Node 22.22.3. The lower bounds above come from source and dependency evidence, not an execution of the complete suite on those exact versions.
