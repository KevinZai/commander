---
name: documentation
category: coding
skills: [update-docs, docs]
mode: code
estimated_tokens: 400
---

# Auto-Generate Documentation

## When to Use
When code exists but documentation is missing or outdated. This template generates docs from the actual code, not from assumptions.

## Template

```
Generate documentation for the following code by reading the source. Do NOT hallucinate APIs — only document what exists.

**Target:**
{{file_paths_or_module_to_document}}

**Doc format:**
{{JSDoc inline|README|API reference markdown|all of the above}}

**Step 1: Inventory**
- Use Glob to find all files in the target: `{{glob_pattern}}`
- Read each file with the Read tool
- Build a list of all exports: functions, classes, types, constants
- Note which are public API vs internal implementation

**Step 2: Generate docs**
For each public export:
- **Description:** one sentence explaining what it does
- **Parameters:** name, type, description, required/optional, default value
- **Return value:** type and description
- **Throws:** what errors can be thrown and when
- **Example:** minimal usage example (must be valid code)

**Step 3: Write docs**
- If JSDoc: add inline comments directly above each export using the Edit tool
- If README: write a module README.md with the full API reference
- If API reference: generate a structured markdown doc

**Step 4: Verify**
- Run `npx tsc --noEmit` to ensure JSDoc additions didn't break types
- Ensure every public export has documentation
- Ensure no documentation references non-existent functions or parameters
```

## Tips
- Use the `update-docs` skill to keep docs in sync with code changes over time
- JSDoc inline is the most maintainable — it lives next to the code it documents
- For large modules, generate a table of contents at the top of the doc

## Example

```
Generate documentation for the following code by reading the source. Do NOT hallucinate APIs — only document what exists.

**Target:**
src/lib/

**Doc format:**
JSDoc inline + a summary README at src/lib/README.md
```
