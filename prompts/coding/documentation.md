---
name: documentation
category: coding
skills: [ccc-update-docs]
mode: code
estimated_tokens: 400
---

# Auto-Generate Documentation

## When to Use
Use when code exists but its documentation is missing or out of date. The template documents only what the source actually exports.

## Template

```
Generate documentation for the code below by reading the source. Document only APIs that exist in the code; if something is unclear, say so instead of guessing.

**Target:**
{{file_paths_or_module_to_document}}

**Doc format:**
{{JSDoc inline|README|API reference markdown|all of the above}}

Step 1: Inventory.
- Use Glob to find every file in the target: `{{glob_pattern}}`.
- Read each file with the Read tool.
- List every export: functions, classes, types, constants.
- Mark each one public API or internal implementation.

Step 2: Draft the docs.
For each public export:
- Description: one sentence on what it does.
- Parameters: name, type, description, required or optional, default value.
- Return value: type and description.
- Throws: which errors it can throw and when.
- Example: a minimal usage example that is valid code.

Step 3: Write the docs.
- JSDoc: add comments directly above each export with the Edit tool.
- README: write a module README.md with the full API reference.
- API reference: write a structured markdown document.

Step 4: Verify.
- Run the type check, for example `npx tsc --noEmit`, to confirm the JSDoc additions did not break types.
- Confirm every public export is documented.
- Confirm no documentation names a function or parameter that does not exist; report the check you ran.
```

## Tips
- `/ccc-update-docs` keeps docs in sync with code as it changes.
- Inline JSDoc is the easiest to maintain because it lives next to the code it describes.
- For a large module, add a table of contents at the top of the generated document.

## Example

```
Generate documentation for the code below by reading the source. Document only APIs that exist in the code; if something is unclear, say so instead of guessing.

**Target:**
src/lib/

**Doc format:**
JSDoc inline + a summary README at src/lib/README.md
```
