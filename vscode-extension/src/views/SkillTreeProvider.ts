import * as vscode from 'vscode';
import { Skill } from '../data/skills';

export class SkillTreeProvider implements vscode.TreeDataProvider<SkillTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SkillTreeItem | undefined | null | void> = new vscode.EventEmitter<SkillTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SkillTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private skills: Skill[]) {}

  getTreeItem(element: SkillTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SkillTreeItem): Thenable<SkillTreeItem[]> {
    if (element === undefined) {
      return Promise.resolve(
        this.skills.map(skill =>
          new SkillTreeItem(
            skill.name,
            skill.description,
            skill.id,
            skill.command || `/${skill.name}`,
            vscode.TreeItemCollapsibleState.None
          )
        )
      );
    }
    return Promise.resolve([]);
  }
}

export class SkillTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly skillId: string,
    public readonly commandStr: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.tooltip = description;
    this.command = {
      command: 'ccc.openSkill',
      title: 'Open Skill',
      arguments: [this.skillId, this.commandStr, this.label]
    };
    this.iconPath = new vscode.ThemeIcon('lightbulb');
  }
}
