'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const LEGACY_STATE_FILE = path.join(
  process.env.HOME || '',
  '.claude',
  'commander',
  'state.json'
);

// The ccc CLI keeps state per lane (<config dir>/commander, CCC_CONFIG_DIR >
// CLAUDE_CONFIG_DIR); read that copy first, else the legacy shared one.
function stateFile() {
  const configDir = process.env.CCC_CONFIG_DIR || process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    const laneFile = path.join(path.resolve(configDir), 'commander', 'state.json');
    if (fs.existsSync(laneFile)) return laneFile;
  }
  return LEGACY_STATE_FILE;
}

function activate(context) {
  const statsProvider = new StatsProvider();
  vscode.window.registerTreeDataProvider('cccStats', statsProvider);
  vscode.window.registerTreeDataProvider('cccSkills', statsProvider);
  vscode.window.registerTreeDataProvider('cccHealth', statsProvider);

  const refreshCmd = vscode.commands.registerCommand('cc-commander.refresh', () => {
    statsProvider.refresh();
  });

  const dashboardCmd = vscode.commands.registerCommand('cc-commander.openDashboard', () => {
    const terminal = vscode.window.createTerminal('CCC');
    terminal.sendText('ccc');
    terminal.show();
  });

  const xrayCmd = vscode.commands.registerCommand('cc-commander.runXray', () => {
    const terminal = vscode.window.createTerminal('CCC X-Ray');
    terminal.sendText('ccc --xray');
    terminal.show();
  });

  context.subscriptions.push(refreshCmd, dashboardCmd, xrayCmd);

  setInterval(() => statsProvider.refresh(), 30000);
}

function deactivate() {}

class StatsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const state = this._loadState();
    if (!state) {
      return [new StatItem('No CCC state found', 'Run ccc to initialize')];
    }

    const items = [];

    if (state.session) {
      items.push(new StatItem('Session', state.session.id || 'active'));
      items.push(new StatItem('Model', state.session.model || 'unknown'));
      items.push(new StatItem('Turns', String(state.session.turns || 0)));
      items.push(new StatItem('Cost', `$${(state.session.cost || 0).toFixed(4)}`));
    }

    if (state.health) {
      items.push(new StatItem('Health', `${state.health.overall || 0}/100`));
    }

    if (state.skills && state.skills.active) {
      items.push(new StatItem('Active Skills', String(state.skills.active.length)));
    }

    if (state.lastXray) {
      items.push(new StatItem('Last X-Ray', state.lastXray.date || 'never'));
    }

    return items.length > 0 ? items : [new StatItem('CCC', 'Ready')];
  }

  _loadState() {
    try {
      const file = stateFile();
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }
}

class StatItem extends vscode.TreeItem {
  constructor(label, value) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `${label}: ${value}`;
    this.description = value;
  }
}

module.exports = { activate, deactivate, stateFile };
