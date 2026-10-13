---
description: "Answer a library, framework or API question from its current documentation via Context7, with code snippets. Use when the user asks how to use a library or wants docs newer than training data."
---

# /ccc-docs — answer from current docs

**CC Commander** · /ccc-docs · a short answer with snippets, backed by the library's current documentation.

## Usage

```
/ccc-docs [library name] [question]
```

Arguments: `$ARGUMENTS`. Quote multi-word arguments so each parses as one token, for example `/ccc-docs "Next.js" "How do I configure middleware?"`.

If the library or the question is missing, ask the user for:

1. The library or product name (for example Next.js, Prisma, Supabase).
2. The specific question or task (for example "How do I set up middleware?").

## What happens

1. Resolve the library id: call the Context7 tool `resolve-library-id` with the library name and the question. It returns a Context7 id such as `/vercel/next.js`. The tool prefix depends on how Context7 is installed (the Commander plugin bundles it as `mcp__plugin_commander_context7__*`). If several ids match, pick the one whose name and description match the library; if it is still ambiguous, ask the user which one.
2. Query the docs: call `query-docs` with that id and the question.
3. Answer concisely with the relevant code examples from the fetched documentation. Name the library, and the version when the docs state one.

## Fallback

If the Context7 tools are not exposed in this session, say so, then answer from training data with a clear note that the documentation may be outdated.

## Done when

The answer cites the Context7 library id it came from, or states that it came from training data.

## See also

`/ccc-research` · `/ccc-knowledge`
