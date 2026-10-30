# Anthropic plugin directory mirror

The Anthropic plugin directory lists plugins whose `.claude-plugin/plugin.json` sits at a repository root. This monorepo keeps the plugin in `commander/cowork-plugin/`, so the listing is built from a generated mirror repo, `KevinZai/cc-commander-plugin`, under the name `cc-commander` (display name "CC Commander").

## Build the mirror

```bash
npm run build:directory-mirror                 # writes to a fresh temp dir and prints it
node scripts/build-directory-mirror.js --out <dir>
```

[`scripts/build-directory-mirror.js`](../scripts/build-directory-mirror.js) copies `commander/cowork-plugin/` to the mirror root and then:

- renames the plugin to `cc-commander` and rewrites the `commander:` namespace and install strings to `cc-commander@claude-community` (Codex lines keep `commander@commander-hub`);
- writes the listing description with counts read from disk, and fails if it mentions "Fable";
- drops the nested `mods/commander-hud/.claude-plugin/plugin.json` and `tests/` directories;
- adds the repository `LICENSE` and a marker file. An existing `--out` directory is only cleared when it carries that marker.

`tests/directory-mirror.test.js` covers these transforms.

## Steps that need Kevin

Each of these is an external action and is not run by any script or CI job:

1. Merge the release and tag it.
2. Create or update the public mirror repo from the builder's output.
3. Run `claude plugin validate <mirror> --strict` and, if wanted, `claude plugin eval` (eval spends model usage).
4. Submit through the directory portal from a paid claude.ai account: plugin bundle, mirror repo URL, icon (it can be set only once), listing copy.
5. After approval, update the install line in the README from `commander@commander-hub` to `cc-commander@claude-community` where it applies.

No credentials are needed to build the mirror.
