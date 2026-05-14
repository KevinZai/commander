import * as vscode from 'vscode';

interface QuickAction {
  label: string;
  description: string;
  command: string;
  icon: string;
}

export class ActionTreeProvider implements vscode.TreeDataProvider<ActionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ActionTreeItem | undefined | null | void> = new vscode.EventEmitter<ActionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ActionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private actions: QuickAction[] = [
    {
      label: 'Open Command Hub',
      description: 'Launch the main /ccc menu',
      command: 'ccc.openCommandHub',
      icon: 'rocket'
    },
    {
      label: 'Open Skill Picker',
      description: 'Browse and launch any skill with Ctrl+Shift+P',
      command: 'ccc.openSkillPicker',
      icon: 'lightbulb'
    },
    {
      label: 'Open Agent Picker',
      description: 'Select a specialist agent',
      command: 'ccc.openAgentPicker',
      icon: 'robot'
    },
    {
      label: 'Read the Bible',
      description: 'Open the Kevin Z Method guide (commanderplugin.com)',
      command: 'ccc.openBible',
      icon: 'book'
    },
    {
      label: 'Install Claude Code Desktop',
      description: 'Get full CC Commander plugin features',
      command: 'ccc.installDesktop',
      icon: 'cloud-download'
    }
  ];

  getTreeItem(element: ActionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ActionTreeItem): Thenable<ActionTreeItem[]> {
    if (element === undefined) {
      return Promise.resolve(
        this.actions.map(action =>
          new ActionTreeItem(
            action.label,
            action.description,
            action.command,
            action.icon,
            vscode.TreeItemCollapsibleState.None
          )
        )
      );
    }
    return Promise.resolve([]);
  }
}

export class ActionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly commandName: string,
    public readonly iconName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.command = {
      command: this.commandName,
      title: label
    };
    this.iconPath = new vscode.ThemeIcon(iconName);
  }
}
