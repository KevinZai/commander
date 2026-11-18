import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const LEGACY_DIR = path.join(os.homedir(), '.claude', 'commander');

// The ccc CLI keeps state per lane (<config dir>/commander, CCC_CONFIG_DIR >
// CLAUDE_CONFIG_DIR); read that copy first, else the legacy shared one.
function statePath(): string {
  const configDir = process.env.CCC_CONFIG_DIR || process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    const laneFile = path.join(path.resolve(configDir), 'commander', 'state.json');
    if (fs.existsSync(laneFile)) return laneFile;
  }
  return path.join(LEGACY_DIR, 'state.json');
}

function readState(): any {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); }
  catch { return { user: { name: 'User', level: 'guided', sessionsCompleted: 0 } }; }
}

// Persisted values come from a file on disk, so they are data, never markup.
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// CLI resolution. The extension runs the globally installed `ccc` CLI. It must
// never run a `bin/kc.js` (or a `ccc`) that merely lives in the open workspace:
// a cloned repository could ship its own file under that name.
// ---------------------------------------------------------------------------

function isInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function workspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders || []).map(f => path.resolve(f.uri.fsPath));
}

function isWorkspacePath(candidate: string): boolean {
  const real = safeRealpath(candidate);
  return workspaceRoots().some(root => isInside(real, root) || isInside(path.resolve(candidate), root));
}

function safeRealpath(p: string): string {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

function isExecutableFile(p: string): boolean {
  try {
    if (!fs.statSync(p).isFile()) return false;
    if (process.platform !== 'win32') fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch { return false; }
}

const BIN_NAMES = process.platform === 'win32' ? ['ccc.cmd', 'ccc.exe', 'ccc'] : ['ccc'];

export function resolveCli(): string | undefined {
  const candidates: string[] = [];

  // 1. Explicit machine-scoped setting (workspace settings cannot set it).
  const configured = vscode.workspace.getConfiguration('ccCommander').inspect<string>('cliPath');
  const userValue = configured?.globalValue;
  if (userValue && path.isAbsolute(userValue)) candidates.push(userValue);

  // 2. PATH entries, skipping relative entries and anything inside the workspace.
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir || !path.isAbsolute(dir)) continue;
    for (const name of BIN_NAMES) candidates.push(path.join(dir, name));
  }

  // 3. Locations the installer links `ccc` into.
  for (const name of BIN_NAMES) {
    candidates.push(path.join(os.homedir(), '.local', 'bin', name));
    candidates.push(path.join('/usr/local/bin', name));
  }

  for (const candidate of candidates) {
    if (isExecutableFile(candidate) && !isWorkspacePath(candidate)) return candidate;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Running the CLI
// ---------------------------------------------------------------------------

const UNTRUSTED_MESSAGE =
  'CC Commander runs commands in your workspace, so it is disabled until you trust this workspace.';

async function requireTrust(): Promise<boolean> {
  if (vscode.workspace.isTrusted) return true;
  const choice = await vscode.window.showWarningMessage(UNTRUSTED_MESSAGE, 'Manage Workspace Trust');
  if (choice === 'Manage Workspace Trust') {
    await vscode.commands.executeCommand('workbench.trust.manage');
  }
  return false;
}

async function runCli(args: string[]): Promise<void> {
  if (!(await requireTrust())) return;
  const cli = resolveCli();
  if (!cli) {
    vscode.window.showErrorMessage(
      'CC Commander: the ccc CLI was not found. Install CC Commander (see https://commanderplugin.com), ' +
      'or set "ccCommander.cliPath" in your user settings to its absolute path.'
    );
    return;
  }
  const terminal = vscode.window.createTerminal({
    name: 'CC Commander',
    shellPath: cli,
    shellArgs: args,
    cwd: workspaceRoots()[0],
  });
  terminal.show();
}

// Buttons map to fixed argument lists; the webview never supplies arguments.
const ACTIONS: Record<string, string[]> = {
  build: [],
  content: [],
  research: [],
  yolo: [],
  skills: ['--list-skills'],
  stats: ['--stats'],
  linear: ['--stats'],
};

class MenuViewProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    const state = readState();
    const nonce = crypto.randomBytes(16).toString('base64');
    const csp = [
      "default-src 'none'",
      `style-src 'nonce-${nonce}'`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');
    const sessions = Number(state.user?.sessionsCompleted);
    const buttons: Array<[string, string]> = [
      ['build', 'Build Something New'],
      ['content', 'Create Content'],
      ['research', 'Research &amp; Analyze'],
      ['yolo', 'YOLO Mode'],
      ['skills', 'Browse Skills'],
      ['stats', 'Check Stats'],
      ['linear', 'Linear Status'],
    ];
    webviewView.webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style nonce="${nonce}">
  body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); }
  h2 { color: var(--vscode-textLink-foreground); margin: 0 0 8px; font-size: 14px; }
  .tagline { opacity: 0.7; font-size: 11px; margin-bottom: 12px; }
  .stat { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .stat-value { font-weight: bold; color: var(--vscode-textLink-foreground); }
  button { width: 100%; padding: 8px; margin: 4px 0; background: var(--vscode-button-background);
    color: var(--vscode-button-foreground); border: none; cursor: pointer; border-radius: 3px; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  .section { margin: 12px 0; }
  hr { border: none; border-top: 1px solid var(--vscode-widget-border); margin: 12px 0; }
</style></head>
<body>
  <h2>CC Commander</h2>
  <div class="tagline">One command. Your AI work, managed by AI.</div>

  <div class="section">
    <div class="stat"><span>User</span><span class="stat-value">${escapeHtml(state.user?.name || 'User')}</span></div>
    <div class="stat"><span>Level</span><span class="stat-value">${escapeHtml(state.user?.level || 'guided')}</span></div>
    <div class="stat"><span>Sessions</span><span class="stat-value">${escapeHtml(Number.isFinite(sessions) ? sessions : 0)}</span></div>
  </div>

  <hr>

  ${buttons.map(([id, label]) => `<button data-command="${id}">${label}</button>`).join('\n  ')}

  <hr>
  <div class="tagline">by Kevin Z — kevinz.ai</div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('button[data-command]').forEach(function (button) {
      button.addEventListener('click', function () {
        vscode.postMessage({ command: button.getAttribute('data-command') });
      });
    });
  </script>
</body></html>`;

    webviewView.webview.onDidReceiveMessage(msg => {
      const command = msg && typeof msg.command === 'string' ? msg.command : '';
      if (Object.prototype.hasOwnProperty.call(ACTIONS, command)) {
        void runCli(ACTIONS[command]);
      }
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const register = (id: string, args: string[]) =>
    vscode.commands.registerCommand(id, () => runCli(args));

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ccCommander.menu', new MenuViewProvider()),
    register('ccCommander.open', []),
    register('ccCommander.stats', ['--stats']),
    register('ccCommander.yolo', []),
    register('ccCommander.skills', ['--list-skills']),
    register('ccCommander.linear', ['--stats']),
    register('ccCommander.dispatch', ['--dispatch']),
    register('ccCommander.status', ['--status']),
  );
}

export function deactivate() {}
