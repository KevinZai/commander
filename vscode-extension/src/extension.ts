import * as vscode from 'vscode';
import { AgentTreeProvider } from './views/AgentTreeProvider';
import { SkillTreeProvider } from './views/SkillTreeProvider';
import { ActionTreeProvider } from './views/ActionTreeProvider';
import { agents } from './data/agents';
import { skills } from './data/skills';

export function activate(context: vscode.ExtensionContext) {
  console.log('CC Commander extension activated!');

  // Register tree data providers
  vscode.window.registerTreeDataProvider('ccc.agents', new AgentTreeProvider(agents));
  vscode.window.registerTreeDataProvider('ccc.skills', new SkillTreeProvider(skills));
  vscode.window.registerTreeDataProvider('ccc.actions', new ActionTreeProvider());

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ccc.openSkillPicker', openSkillPicker),
    vscode.commands.registerCommand('ccc.openAgentPicker', openAgentPicker),
    vscode.commands.registerCommand('ccc.openSkill', openSkill),
    vscode.commands.registerCommand('ccc.openAgent', openAgent),
    vscode.commands.registerCommand('ccc.openCommandHub', openCommandHub),
    vscode.commands.registerCommand('ccc.openBible', openBible),
    vscode.commands.registerCommand('ccc.installDesktop', installDesktop)
  );
}

async function openSkillPicker() {
  const pick = await vscode.window.showQuickPick(
    skills.map(s => ({
      label: s.name,
      description: s.description.substring(0, 60),
      detail: s.description,
      command: s.command || `/${s.name}`
    })),
    {
      placeHolder: 'Search and select a skill to launch',
      matchOnDescription: true,
      matchOnDetail: true
    }
  );

  if (pick) {
    openInDesktopOrPrompt(pick.command);
  }
}

async function openAgentPicker() {
  const pick = await vscode.window.showQuickPick(
    agents.map(a => ({
      label: a.name,
      description: `${a.effort.toUpperCase()} · ${a.model}`,
      detail: a.description,
      agentId: a.id
    })),
    {
      placeHolder: 'Select a specialist agent',
      matchOnDescription: true,
      matchOnDetail: true
    }
  );

  if (pick) {
    const prompt = `Use the @${pick.label} agent to help with this task. Full agent info: ${pick.detail}`;
    openInDesktopOrPrompt(prompt);
  }
}

async function openSkill(skillId: string, command: string, label: string) {
  vscode.window.showInformationMessage(`Opening skill: ${label}`);
  openInDesktopOrPrompt(command);
}

async function openAgent(agentId: string, label: string) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;
  const prompt = `Use the @${label} agent to help with this task.`;
  openInDesktopOrPrompt(prompt);
}

async function openCommandHub() {
  openInDesktopOrPrompt('/ccc');
}

async function openBible() {
  vscode.env.openExternal(vscode.Uri.parse('https://github.com/KevinZai/commander/blob/main/BIBLE.md'));
}

async function installDesktop() {
  const action = await vscode.window.showQuickPick(
    [
      {
        label: 'Open Claude Code Desktop',
        description: 'Download and install Claude Code Desktop for full CC Commander plugin support'
      },
      {
        label: 'View Documentation',
        description: 'Learn more about CC Commander on GitHub'
      }
    ],
    { placeHolder: 'Install Claude Code Desktop for full CC Commander power' }
  );

  if (action?.label === 'Open Claude Code Desktop') {
    vscode.env.openExternal(vscode.Uri.parse('https://claude.ai/download'));
  } else if (action?.label === 'View Documentation') {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/KevinZai/commander#readme'));
  }
}

function openInDesktopOrPrompt(prompt: string) {
  const cfg = vscode.workspace.getConfiguration('ccCommander');
  const openInDesktop = cfg.get<boolean>('openInDesktop', true);

  if (openInDesktop) {
    // Attempt to open in Claude Code Desktop via URI scheme
    const uri = vscode.Uri.parse(`vscode://anthropic.claude-code/?prompt=${encodeURIComponent(prompt)}`);
    vscode.env.openExternal(uri).then(
      () => {
        // Success - opened in Desktop
      },
      () => {
        // Fallback: insert into active editor
        insertIntoEditor(prompt);
      }
    );
  } else {
    // Insert into editor
    insertIntoEditor(prompt);
  }
}

function insertIntoEditor(text: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage(`CC Commander: ${text}`);
    return;
  }

  editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, text + '\n');
  });
}

export function deactivate() {}
