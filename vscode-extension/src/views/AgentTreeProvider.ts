import * as vscode from 'vscode';
import { Agent } from '../data/agents';

export class AgentTreeProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private agents: Agent[]) {}

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> {
    if (element === undefined) {
      return Promise.resolve(
        this.agents.map(agent =>
          new AgentTreeItem(
            agent.name,
            `${agent.effort.toUpperCase()} · ${agent.model}`,
            agent.id,
            agent.description,
            vscode.TreeItemCollapsibleState.None
          )
        )
      );
    }
    return Promise.resolve([]);
  }
}

export class AgentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly agentId: string,
    public readonly fullDescription: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.tooltip = fullDescription;
    this.command = {
      command: 'ccc.openAgent',
      title: 'Open Agent',
      arguments: [this.agentId, this.label]
    };
    this.iconPath = new vscode.ThemeIcon('robot');
  }
}
