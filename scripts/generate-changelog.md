# generate-changelog

Generate a new `CHANGELOG.md` section from conventional commits.

## Usage

```sh
npm run changelog -- --version v4.0.0-beta.12 --dry-run
npm run changelog -- --version v4.0.0-beta.12 --insert
```

By default, the script reads the latest version from `CHANGELOG.md`, derives the previous tag as `v<latest>`, and runs:

```sh
git log <prev-tag>..HEAD --pretty=format:"%H|%s|%b"
```

If the exact previous tag is missing locally, it falls back to the nearest reachable git tag and prints a warning.

## Flags

- `--version <next>`: next release version, with or without a leading `v`.
- `--dry-run`: print the generated section to stdout without writing files.
- `--insert`: insert or replace the generated section above the current latest changelog entry.
- `--check-version`: fail unless the latest `CHANGELOG.md` entry equals `package.json.version`.
- `--prev-tag <tag>`: override the git range start tag.
- `--stdin`: read preformatted git log records from stdin instead of invoking git.
- `--changelog <path>`: read or write a changelog at a custom path.
- `--package <path>`: read a custom `package.json` for `--check-version`.
- `--repo <path>`: run git commands from a custom repository root.
- `--date <YYYY-MM-DD>`: override the generated release date.

## Examples

Preview the next beta entry:

```sh
node scripts/generate-changelog.js --version v4.0.0-beta.12 --dry-run
```

Insert the entry into `CHANGELOG.md`:

```sh
node scripts/generate-changelog.js --version v4.0.0-beta.12 --insert
```

Verify publish readiness:

```sh
node scripts/generate-changelog.js --check-version
```
