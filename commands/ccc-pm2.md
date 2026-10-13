---
description: "Scan a project for its frontend, backend and Python services and generate a PM2 ecosystem.config.cjs plus start, stop, restart, logs and status commands. Use when you want local dev services managed by PM2."
---

# /ccc-pm2 — PM2 setup for a project

**CC Commander** · /ccc-pm2 · detects the project's services and writes a PM2 config and one-line lifecycle commands.

Arguments: `$ARGUMENTS` (optional: services, names or ports to use instead of detected ones).

## What happens

1. Check PM2:

   ```bash
   pm2 --version
   ```

   If it is missing, ask with AskUserQuestion:

   - 🟢 Use `npx pm2` — no global install; generated commands use `npx pm2`.
   - Install globally — runs `npm install -g pm2`.
   - Stop — nothing is generated.

2. Detect the platform (`node -p process.platform`). `win32` uses the Windows rules below; macOS and Linux use plain commands.

3. Scan the project for services:

   | Type | Detection | Default port |
   |---|---|---|
   | Vite | `vite.config.*` | 5173 |
   | Next.js | `next.config.*` | 3000 |
   | Nuxt | `nuxt.config.*` | 3000 |
   | CRA | `react-scripts` in `package.json` | 3000 |
   | Express/Node | `server/`, `backend/` or `api/` directory with `package.json` | 3000 |
   | FastAPI/Flask | `requirements.txt` or `pyproject.toml` | 8000 |
   | Go | `go.mod` or `main.go` | 8080 |

   Port priority: user-specified > `.env` > framework config file > script arguments > default port. Name each app `<project>-<port>`.

4. Show the detected services and the files you will write, then ask:

   - 🟢 Generate all — writes every file listed under Generated files.
   - Config only — writes `ecosystem.config.cjs` (and Python wrappers) only.
   - Cancel — nothing is written.

5. Generate `ecosystem.config.cjs`, Python wrappers, the command files in `.claude/commands/` and, on Windows, the scripts in `.claude/scripts/`.

6. Update the project's `CLAUDE.md` with the PM2 section (see Post-init).

7. Verify:

   ```bash
   node -e "const c=require('./ecosystem.config.cjs');console.log(c.apps.map(a=>a.name).join(', '))"
   ls .claude/commands/pm2-*.md
   ```

   Report the app names printed and the command files found. Do not start services unless the user asks.

8. Print the completion summary.

## Generated files

```text
project/
├── ecosystem.config.cjs          PM2 config
├── <backend>/start.cjs           Python wrapper (if applicable)
└── .claude/
    ├── commands/
    │   ├── pm2-all.md            start all + monitor
    │   ├── pm2-all-stop.md       stop all
    │   ├── pm2-all-restart.md    restart all
    │   ├── pm2-<port>.md         start one + logs
    │   ├── pm2-<port>-stop.md    stop one
    │   ├── pm2-<port>-restart.md restart one
    │   ├── pm2-logs.md           all logs
    │   └── pm2-status.md         status
    └── scripts/                  Windows only
        ├── pm2-logs-<port>.ps1   one service's logs
        └── pm2-monit.ps1         PM2 monitor
```

## ecosystem.config.cjs

Always use the `.cjs` extension. Point `script` at the framework's binary directly.

```javascript
module.exports = {
  apps: [
    {
      name: 'project-3000',
      cwd: './packages/web',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 3000',
      env: { NODE_ENV: 'development' }
    },
    {
      name: 'project-8000',
      cwd: './backend',
      script: 'start.cjs',
      env: { PYTHONUNBUFFERED: '1' }
    }
  ]
}
```

| Framework | script | args |
|---|---|---|
| Vite | `node_modules/vite/bin/vite.js` | `--port <port>` |
| Next.js | `node_modules/next/dist/bin/next` | `dev -p <port>` |
| Nuxt | `node_modules/nuxt/bin/nuxt.mjs` | `dev --port <port>` |
| Express | `src/index.js` or `server.js` | none |

On Windows, add `interpreter` with the Node.js path from `where node` (for example `C:/Program Files/nodejs/node.exe`) to every app.

### Python wrapper (`start.cjs`)

```javascript
const { spawn } = require('child_process');
const proc = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], {
  cwd: __dirname, stdio: 'inherit', windowsHide: true
});
proc.on('close', (code) => process.exit(code));
```

Adjust the module path and port to the detected app. Bind to `127.0.0.1` unless the user asks for network access.

## Command file templates

Each command file holds one description line and one bash block, so it runs without interpretation. `<PROJECT_ROOT>` is the absolute project path, `<name>` the PM2 app name.

### macOS and Linux

| File | Description | Command |
|---|---|---|
| `pm2-all.md` | Start all services and open the monitor. | `cd "<PROJECT_ROOT>" && pm2 start ecosystem.config.cjs && pm2 monit` |
| `pm2-all-stop.md` | Stop all services. | `cd "<PROJECT_ROOT>" && pm2 stop all` |
| `pm2-all-restart.md` | Restart all services. | `cd "<PROJECT_ROOT>" && pm2 restart all` |
| `pm2-<port>.md` | Start `<name>` and show logs. | `cd "<PROJECT_ROOT>" && pm2 start ecosystem.config.cjs --only <name> && pm2 logs <name>` |
| `pm2-<port>-stop.md` | Stop `<name>`. | `cd "<PROJECT_ROOT>" && pm2 stop <name>` |
| `pm2-<port>-restart.md` | Restart `<name>`. | `cd "<PROJECT_ROOT>" && pm2 restart <name>` |
| `pm2-logs.md` | View all PM2 logs. | `cd "<PROJECT_ROOT>" && pm2 logs` |
| `pm2-status.md` | View PM2 status. | `cd "<PROJECT_ROOT>" && pm2 status` |

File shape:

````markdown
Stop all services.
```bash
cd "<PROJECT_ROOT>" && pm2 stop all
```
````

### Windows

Same files, except the two that open a viewer start it in a new Windows Terminal window:

````markdown
Start all services and open PM2 monitor.
```bash
cd "<PROJECT_ROOT>" && pm2 start ecosystem.config.cjs && start wt.exe -d "<PROJECT_ROOT>" pwsh -NoExit -c "pm2 monit"
```
````

````markdown
Start <name> (<port>) and open logs.
```bash
cd "<PROJECT_ROOT>" && pm2 start ecosystem.config.cjs --only <name> && start wt.exe -d "<PROJECT_ROOT>" pwsh -NoExit -c "pm2 logs <name>"
```
````

PowerShell scripts:

```powershell
# .claude/scripts/pm2-logs-<port>.ps1
Set-Location "<PROJECT_ROOT>"
pm2 logs <name>
```

```powershell
# .claude/scripts/pm2-monit.ps1
Set-Location "<PROJECT_ROOT>"
pm2 monit
```

## Key rules

1. Config file is `ecosystem.config.cjs`, not `.js`.
2. Node.js apps point at the framework binary; on Windows also set `interpreter`.
3. Python apps run through the Node.js wrapper with `windowsHide: true`.
4. New windows on Windows: `start wt.exe -d "<path>" pwsh -NoExit -c "<command>"`.
5. Command files stay minimal: one description line and one bash block.

## Post-init: CLAUDE.md

Append this section to the project's `CLAUDE.md` (create the file if it does not exist). If a `## PM2 Services` section already exists, replace it. Keep it minimal.

````markdown
## PM2 Services

| Port | Name | Type |
|------|------|------|
| <port> | <name> | <type> |

**Terminal commands:**
```bash
pm2 start ecosystem.config.cjs   # first time
pm2 start all                    # after first time
pm2 stop all / pm2 restart all
pm2 start <name> / pm2 stop <name>
pm2 logs / pm2 status / pm2 monit
pm2 save                         # save process list
pm2 resurrect                    # restore saved list
```
````

## Post-init: summary

Print:

```text
## PM2 init complete

Services:
| Port | Name | Type |
| <port> | <name> | <type> |

Claude commands: /pm2-all, /pm2-all-stop, /pm2-<port>, /pm2-<port>-stop, /pm2-logs, /pm2-status

Terminal commands:
  First time:   pm2 start ecosystem.config.cjs && pm2 save
  Afterwards:   pm2 start all | pm2 stop all | pm2 restart all
                pm2 start <name> | pm2 stop <name>
                pm2 logs | pm2 monit | pm2 resurrect

Run `pm2 save` after the first start to enable the short commands.
```

## Done when

Step 7 printed the app names from `ecosystem.config.cjs` and listed the generated command files.

## Guardrails

- Do not start, stop or restart services during setup unless the user asks.
- Do not print `pm2 env` or `pm2 describe` output; it includes process environment values.
- Check that a chosen port is free (`lsof -i :<port>` on macOS/Linux, `netstat -ano | findstr :<port>` on Windows) before writing it into the config.

## See also

`/ccc-openclaw-manage` · `/ccc-parallel`
