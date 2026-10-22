# Offline audit report

From the repository checkout, run:

```sh
node scripts/audit-report.mjs /path/to/local/repo --out /path/to/new-report.md
node --test tests/audit-report-runner.test.js tests/audit-report-template.test.js
```

The output parent must already exist; existing files and symlinks are never overwritten.
The runner imports the slice-1 renderer and writes Markdown without external services or dependencies.
It inventories regular file names, counts recognized language extensions, lists package manifests and detects test filenames.
No target source, manifest or environment file contents are read. Target scripts and tests are never executed.
Git is optional for plain directories and required when `.git` exists; unreadable Git metadata fails explicitly.
Git runs with transports disabled and without inherited environment credentials or global Git configuration.
Committed environment findings use names at HEAD, including files missing from the working tree, and do not scan history or staged-only files.
Exact `.env.example`, `.env.sample` and `.env.template` names are treated as examples, without inspecting contents.
The working-tree inventory includes untracked files and does not apply Git ignore rules.
It skips symlinks, `.git`, `.cache`, `node_modules`, `vendor`, `.venv`, `venv`, `__pycache__`, `dist`, `build` and `coverage`.
Scores and deeper assessments remain unassessed. Test presence does not imply passing tests; manifest presence does not assess dependencies.
Tests use synthetic repositories under the ignored `.cache` directory and retain them for local inspection.
