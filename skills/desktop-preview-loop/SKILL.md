---
name: desktop-preview-loop
description: |
  Server-browser-test-iterate development cycle using Claude Desktop's preview
  feature or Playwright MCP. Start dev server, open browser, test interactions,
  capture results, fix issues, iterate. Supports Next.js, Vite, Express, and
  other frameworks with auto-detection.
triggers:
  - /preview-loop
  - desktop preview
  - dev server loop
  - browser test loop
  - preview iterate
disable-model-invocation: true
---

# Desktop Preview Loop

A tight development cycle: start server, preview in browser, test, fix, iterate. Designed for rapid UI development where you want to see your changes live and fix issues in real time.

## The Loop

```
Start dev server
     |
     v
Open browser preview
     |
     v
Test UI interactions ----+
     |                    |
     v                    |
Capture results           |
     |                    |
     v                    |
Issues found? --Yes--> Fix code
     |                    |
     No                   |
     |                    |
     v                    |
     SHIP <---------------+
```

## Supported Frameworks

| Framework | Dev Command | Default Port | Auto-Detected |
|---|---|---|---|
| Next.js | `npm run dev` / `next dev` | 3000 | Yes |
| Vite (React, Vue, Svelte) | `npm run dev` / `vite` | 5173 | Yes |
| Create React App | `npm start` / `react-scripts start` | 3000 | Yes |
| Express | `npm run dev` / `node server.js` | 3000 | Yes |
| Remix | `npm run dev` / `remix dev` | 3000 | Yes |
| Astro | `npm run dev` / `astro dev` | 4321 | Yes |
| SvelteKit | `npm run dev` / `vite dev` | 5173 | Yes |
| Nuxt | `npm run dev` / `nuxi dev` | 3000 | Yes |
| Custom | User-specified | User-specified | Manual |

### Auto-Detection Logic

The skill detects the framework from `package.json`:

```
1. Read package.json → dependencies + devDependencies
2. Match: next → Next.js, vite → Vite, express → Express, ...
3. Read scripts.dev for the exact command
4. Fall back to npm run dev if uncertain
```

## Usage

### Quick Start

```
/preview-loop

# Auto-detects framework, starts server, opens browser
```

### Explicit Framework

```
/preview-loop --framework next --port 3000
```

### Custom Server Command

```
/preview-loop --cmd "node server.js" --port 8080
```

## Step-by-Step Workflow

### Step 1: Start Dev Server

```bash
# Auto-detected or user-specified
npm run dev &

# Wait for server to be ready
# Poll: curl -s http://localhost:3000 until 200
```

The skill waits for the server to respond before proceeding. Timeout: 30 seconds. If the server doesn't start, it reads stderr for error messages and attempts common fixes (missing deps, port conflicts).

### Step 2: Open Browser Preview

**With Playwright MCP (recommended):**
```
Navigate to http://localhost:3000
Wait for page to be fully loaded (networkidle)
Take initial screenshot
```

**With Claude Desktop preview:**
```
Open browser preview pane
Navigate to target URL
Capture rendered state
```

### Step 3: Test UI Interactions

The loop tests in this order:

1. **Visual rendering** -- does the page look correct?
2. **Navigation** -- do links and routes work?
3. **Forms** -- can forms be filled and submitted?
4. **State management** -- does the UI update on interaction?
5. **Error states** -- what happens with invalid input?

### Step 4: Capture Results

For each test:
- Screenshot of current state
- Console output (errors, warnings)
- Network requests (failed API calls)
- Accessibility warnings

### Step 5: Fix and Iterate

```
Issue: Form submit button disabled after first click
Root cause: State not reset after submission
Fix: Reset isSubmitting state in the finally block
Verify: Re-test form submission — button re-enables correctly
```

## Multi-Page Testing

```
/preview-loop --pages "/,/dashboard,/settings,/profile"
```

Tests each page in sequence:
1. Navigate to page
2. Screenshot
3. Check for errors
4. Move to next page
5. Report issues across all pages

## Hot Reload Integration

The loop works with hot module replacement (HMR):

1. Fix code in editor
2. HMR updates the browser automatically
3. Take new screenshot after HMR settles (wait 1 second)
4. Compare with previous screenshot
5. Verify fix applied correctly

No need to restart the server between iterations.

## Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 10 |
| Server start timeout | 30 seconds |
| Page load timeout | 15 seconds |
| Cost ceiling | $3.00 per session |
| Port conflict | Auto-detects and suggests alternative port |
| Zombie processes | Kills dev server on loop exit |

## Example Session

```
[preview-loop] Detected: Next.js 15 (npm run dev, port 3000)
[preview-loop] Starting dev server...
[preview-loop] Server ready at http://localhost:3000 (2.1s)

[Iteration 1] Testing /
  Screenshot: homepage renders correctly
  Console: 1 warning (missing key prop in list)
  Fix: Added key={item.id} to ProductList map

[Iteration 2] Testing /
  Screenshot: clean render, no console warnings
  Testing /dashboard
  Screenshot: chart component not loading
  Console: Error — Cannot read property 'data' of undefined
  Fix: Added loading state and null check to ChartWidget

[Iteration 3] Testing /dashboard
  Screenshot: chart renders with loading skeleton
  Testing /settings
  Screenshot: form layout broken on narrow viewport
  Fix: Changed grid to flex-wrap in settings form

[Iteration 4] All pages clean. No console errors.

[preview-loop] COMPLETE — 4 iterations, 3 fixes applied
  Pages tested: /, /dashboard, /settings
  Cost: $0.89
  Server stopped.
```

## Configuration

Create `.preview-loop.json` in project root for persistent config:

```json
{
  "framework": "next",
  "port": 3000,
  "pages": ["/", "/dashboard", "/settings", "/profile"],
  "viewports": ["desktop", "mobile"],
  "maxIterations": 10,
  "waitAfterHMR": 1000,
  "ignoreWarnings": ["prop-types", "act()"]
}
```

## Tips

- Run `npm install` before starting the loop if you've changed dependencies
- Use `.preview-loop.json` to avoid re-specifying config each time
- Test the most complex page first -- it usually surfaces the most issues
- Use multi-viewport mode for responsive checks (add `--viewports "desktop,mobile"`)
- Kill the server explicitly if the loop crashes (`lsof -ti:3000 | xargs kill`)
