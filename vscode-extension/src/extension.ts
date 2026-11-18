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
    await openInDesktopOrPrompt(pick.command);
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
    await openInDesktopOrPrompt(prompt);
  }
}

async function openSkill(skillId: string, command: string, label: string) {
  vscode.window.showInformationMessage(`Opening skill: ${label}`);
  await openInDesktopOrPrompt(command);
}

async function openAgent(agentId: string, label: string) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;
  const prompt = `Use the @${label} agent to help with this task.`;
  await openInDesktopOrPrompt(prompt);
}

async function openCommandHub() {
  await openInDesktopOrPrompt('/ccc');
}

async function openBible() {
  await openUrl('https://github.com/KevinZai/commander/blob/main/BIBLE.md');
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
    await openUrl('https://claude.ai/download');
  } else if (action?.label === 'View Documentation') {
    await openUrl('https://github.com/KevinZai/commander#readme');
  }
}

// vscode.env.openExternal resolves false (it does not reject) when the target
// could not be opened, so a resolved value must be checked, not just a rejection.
async function openUrl(url: string): Promise<boolean> {
  let opened = false;
  try {
    opened = await vscode.env.openExternal(vscode.Uri.parse(url));
  } catch {
    opened = false;
  }
  if (!opened) {
    vscode.window.showWarningMessage(`CC Commander: could not open ${url}. Copy the link into your browser.`);
  }
  return opened;
}

async function openInDesktopOrPrompt(prompt: string) {
  const cfg = vscode.workspace.getConfiguration('ccCommander');
  const openInDesktop = cfg.get<boolean>('openInDesktop', true);

  if (!openInDesktop) {
    insertIntoEditor(prompt);
    return;
  }

  // Attempt to open in Claude Code Desktop via URI scheme
  const uri = vscode.Uri.parse(`vscode://anthropic.claude-code/?prompt=${encodeURIComponent(prompt)}`);
  let opened = false;
  try {
    opened = await vscode.env.openExternal(uri);
  } catch {
    opened = false;
  }
  if (!opened) {
    // openExternal resolves false when nothing handled the link: say so and keep the command usable.
    try { await vscode.env.clipboard.writeText(prompt); } catch { /* clipboard unavailable */ }
    vscode.window.showWarningMessage(
      `CC Commander: Claude Code Desktop did not open. Copied to clipboard: ${prompt}`
    );
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
