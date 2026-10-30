import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LEGACY_DIR = path.join(os.homedir(), '.claude', 'commander');
const SESSIONS_DIR = path.join(LEGACY_DIR, 'sessions');

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

class MenuViewProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    const state = readState();
    webviewView.webview.html = `<!DOCTYPE html>
<html>
<head><style>
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
  <div class="tagline">280+ skills. One command. Your AI work, managed by AI.</div>

  <div class="section">
    <div class="stat"><span>User</span><span class="stat-value">${state.user?.name || 'User'}</span></div>
    <div class="stat"><span>Level</span><span class="stat-value">${state.user?.level || 'guided'}</span></div>
    <div class="stat"><span>Sessions</span><span class="stat-value">${state.user?.sessionsCompleted || 0}</span></div>
  </div>

  <hr>

  <button onclick="vscode.postMessage({command:'build'})">Build Something New</button>
  <button onclick="vscode.postMessage({command:'content'})">Create Content</button>
  <button onclick="vscode.postMessage({command:'research'})">Research & Analyze</button>
  <button onclick="vscode.postMessage({command:'yolo'})">YOLO Mode</button>
  <button onclick="vscode.postMessage({command:'skills'})">Browse Skills (280+)</button>
  <button onclick="vscode.postMessage({command:'stats'})">Check Stats</button>
  <button onclick="vscode.postMessage({command:'linear'})">Linear Status</button>

  <hr>
  <div class="tagline">by Kevin Z — kevinz.ai</div>

  <script>const vscode = acquireVsCodeApi();</script>
</body></html>`;

    webviewView.webview.onDidReceiveMessage(msg => {
      const terminal = vscode.window.createTerminal('CC Commander');
      switch (msg.command) {
        case 'build': terminal.sendText('node bin/kc.js'); break;
        case 'content': terminal.sendText('node bin/kc.js'); break;
        case 'research': terminal.sendText('node bin/kc.js'); break;
        case 'yolo': terminal.sendText('node bin/kc.js'); break;
        case 'skills': terminal.sendText('node bin/kc.js'); break;
        case 'stats': terminal.sendText('node bin/kc.js --stats'); break;
        case 'linear': terminal.sendText('node bin/kc.js --stats'); break;
      }
      terminal.show();
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ccCommander.menu', new MenuViewProvider()),
    vscode.commands.registerCommand('ccCommander.open', () => {
      const t = vscode.window.createTerminal('CC Commander');
      t.sendText('node bin/kc.js');
      t.show();
    }),
    vscode.commands.registerCommand('ccCommander.stats', () => {
      const t = vscode.window.createTerminal('CC Commander');
      t.sendText('node bin/kc.js --stats');
      t.show();
    }),
    vscode.commands.registerCommand('ccCommander.yolo', () => {
      const t = vscode.window.createTerminal('CC Commander');
      t.sendText('node bin/kc.js');
      t.show();
    }),
    vscode.commands.registerCommand('ccCommander.skills', () => {
      const t = vscode.window.createTerminal('CC Commander');
      t.sendText('node bin/kc.js');
      t.show();
    }),
    vscode.commands.registerCommand('ccCommander.linear', () => {
      const t = vscode.window.createTerminal('CC Commander');
      t.sendText('node bin/kc.js --stats');
      t.show();
    }),
  );
}

export function deactivate() {}
