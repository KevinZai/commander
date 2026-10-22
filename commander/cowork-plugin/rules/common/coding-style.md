# Coding Style

Follow the repository's existing conventions first. These defaults apply where the project is silent.

## Immutability

Prefer returning a new value over mutating shared state:

```
avoid:  modify(original, field, value)   // changes original in place
prefer: update(original, field, value)   // returns a new copy
```

Local mutation is fine when ownership is clear and the framework expects it.

## File organization

- High cohesion, low coupling; organize by feature or domain, not by type.
- Prefer several focused files over one large one. Split when a file mixes responsibilities, not at a fixed line count.
- Extract utilities only when two or more callers need them.

## Error handling

- Handle errors where you can add recovery or useful context; preserve the cause.
- User-facing messages are clear and leak nothing internal. Detailed context goes to server-side logs, never secrets.
- Never swallow an error silently.

## Input validation

- Validate every untrusted input at the system boundary (user input, API responses, file content).
- Use the project's schema validator where one exists.
- Fail fast with a clear message.

## Before marking code complete

- [ ] Names are readable; functions do one thing.
- [ ] No deep nesting (more than four levels is a smell).
- [ ] Errors are handled at the right level.
- [ ] No hardcoded values that belong in constants or config.
- [ ] No unrelated reformatting in the diff.
- [ ] Comments explain constraints the code cannot express, not what the code does.
