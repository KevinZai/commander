---
name: voice-workflow
description: |
  Voice-optimized command flows for /voice coding sessions. Short voice aliases
  for common commands, dictation patterns for describing code, audio-friendly
  feedback formatting, and integration with /btw for side questions. Setup
  instructions and dictation tips included.
triggers:
  - /voice-workflow
  - voice coding
  - voice commands
  - dictation mode
  - hands free coding
disable-model-invocation: true
---

# Voice Workflow

Patterns for voice-first coding with Claude Code. Optimized for dictation: short phrases, clear confirmations, and audio-friendly output.

## Setup

### Prerequisites

1. **Claude Code CLI** with voice input enabled
2. **Microphone** -- any built-in mic works; recommended: AirPods Pro (beam-forming) or a USB condenser mic
3. **Quiet environment** or noise-canceling microphone
4. **macOS Dictation** (System Settings > Keyboard > Dictation) as a fallback input method

### Enabling Voice Mode

```bash
# Start Claude Code in voice mode
claude --voice

# Or activate mid-session
/voice on
/voice off
```

## Voice Command Aliases

Short phrases that map to full commands. Designed to be easy to pronounce and unambiguous.

### Navigation

| Voice Phrase | Maps To | Description |
|---|---|---|
| "read file X" | `Read(X)` | Read a file |
| "show file X" | `Read(X)` | Read a file |
| "find X" | `Grep(pattern=X)` | Search codebase |
| "search for X" | `Grep(pattern=X)` | Search codebase |
| "list files" | `Glob(pattern=*)` | List directory |
| "what files changed" | `git status` | Show git status |

### Editing

| Voice Phrase | Maps To | Description |
|---|---|---|
| "edit file X" | `Edit(file=X)` | Start editing |
| "add function X" | Generate function stub | Create new function |
| "rename X to Y" | Rename across codebase | Multi-file rename |
| "delete line X" | Remove specific line | Line deletion |
| "move this to file X" | Extract to new file | Refactor |

### Building

| Voice Phrase | Maps To | Description |
|---|---|---|
| "run tests" | `npm test` | Execute test suite |
| "build it" | `npm run build` | Run build |
| "type check" | `npx tsc --noEmit` | TypeScript check |
| "lint it" | `npm run lint` | Run linter |
| "start server" | `npm run dev` | Start dev server |
| "stop server" | Kill dev server | Stop dev server |

### Git

| Voice Phrase | Maps To | Description |
|---|---|---|
| "commit this" | `git add . && git commit` | Stage and commit |
| "commit message X" | `git commit -m "X"` | Commit with message |
| "push it" | `git push` | Push to remote |
| "new branch X" | `git checkout -b X` | Create branch |
| "show diff" | `git diff` | Show changes |
| "pull latest" | `git pull` | Pull from remote |

### CC Commander

| Voice Phrase | Maps To | Description |
|---|---|---|
| "plan this" | `/plan` | Enter plan mode |
| "verify" | `/verify` | Run verification |
| "review code" | `/code-review` | Code review |
| "check point" | `/checkpoint` | Save checkpoint |
| "save session" | `/save-session` | Persist session |

## Dictation Patterns for Code

Voice descriptions that Claude translates into code.

### Describing Functions

```
Voice: "Create a function called fetch user that takes a user ID string
        and returns a promise of user or null. It should call the API at
        slash API slash users slash the ID."

Result:
async function fetchUser(userId: string): Promise<User | null> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) return null;
  return res.json();
}
```

### Describing Types

```
Voice: "Define a type called order with fields: ID string, items array of
        order item, total number, status which is pending or shipped or
        delivered, and created at date."

Result:
type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: Date;
};
```

### Describing Changes

```
Voice: "In the dashboard component, add a loading spinner that shows
        while data is being fetched. Use the spinner component from
        the UI library. Hide it when data is loaded."
```

### Describing Tests

```
Voice: "Write a test for fetch user. It should mock the API call.
        Test three cases: successful fetch returns user object,
        not found returns null, network error throws."
```

## Audio-Friendly Feedback

When in voice mode, Claude Code adjusts output:

### Concise Confirmations

Instead of:
```
I've updated the file src/components/Dashboard.tsx. The changes include
adding a loading state using useState, wrapping the data fetch in a
useEffect hook, and conditionally rendering a Spinner component when
isLoading is true.
```

Voice-optimized:
```
Done. Dashboard now shows a spinner while loading.
3 lines added, 1 modified.
```

### Error Reporting

Instead of long stack traces:
```
Test failed. Auth test, line 42.
Expected status 200, got 401.
Likely cause: missing auth token in test setup.
Want me to fix it?
```

### Progress Updates

```
Running tests... 140 of 142 passing. 2 failing.
The failures are in the auth module.
```

## /btw Integration

Use `/btw` for side questions during voice sessions without losing context:

```
Voice: "BTW what's the syntax for Zod optional with default?"

Claude: "z.string().optional().default('value'). Back to the dashboard."

Voice: "OK continue with the form validation."
```

The `/btw` pattern:
1. Pauses current task context
2. Answers the side question immediately
3. Returns to the main task without losing state
4. No context wasted on the tangent

## Voice Session Best Practices

### Be Specific

```
Good: "Add a try catch around the fetch call in the auth service file"
Bad:  "Fix the error handling"
```

### Use File Names

```
Good: "In dashboard dot tsx, line 42"
Bad:  "In that component we were looking at"
```

### Spell Unusual Names

```
"Function name: fetch user DAO, that's D-A-O"
"Variable name: HMAC key, that's H-M-A-C"
```

### Confirm Before Destructive Actions

Claude will always confirm before:
- Deleting files
- Force-pushing
- Dropping database tables
- Overwriting configurations

### Use Numbered Steps for Complex Tasks

```
Voice: "I need three changes. One, add the loading state.
        Two, show the spinner during fetch.
        Three, add error handling with a toast notification."
```

## Dictation Tips

### Punctuation

| Say | Gets |
|---|---|
| "period" | `.` |
| "comma" | `,` |
| "colon" | `:` |
| "semicolon" | `;` |
| "open paren / close paren" | `( )` |
| "open bracket / close bracket" | `[ ]` |
| "open brace / close brace" | `{ }` |
| "arrow" or "fat arrow" | `=>` |
| "equals" | `=` |
| "triple equals" | `===` |
| "backtick" | `` ` `` |
| "new line" | Line break |
| "tab" | Indentation |

### Common Coding Phrases

| Say | Intent |
|---|---|
| "string type" | `: string` |
| "number type" | `: number` |
| "boolean type" | `: boolean` |
| "array of X" | `X[]` |
| "promise of X" | `Promise<X>` |
| "null or X" | `X | null` |
| "optional X" | `X?` |
| "async function" | `async function` |
| "await" | `await` |
| "constant" | `const` |
| "let variable" | `let` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CLAUDE_VOICE_MODE` | `off` | Enable voice optimizations |
| `CLAUDE_VOICE_CONFIRM_DESTRUCTIVE` | `true` | Confirm before destructive ops |
| `CLAUDE_VOICE_CONCISE` | `true` | Short responses in voice mode |
| `CLAUDE_VOICE_SPELL_CHECK` | `true` | Auto-correct common dictation errors |
