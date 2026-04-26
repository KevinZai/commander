import { resolveSkillSource } from "./skill-source.js";

export const TARGET_ENVS = ["claude-cli", "claude-desktop", "codex-cli", "cursor"] as const;

export type TargetEnv = (typeof TARGET_ENVS)[number];
export type InstallSkillStatus = "installed" | "would-install" | "already-present" | "error";

export type InstallSkillArgs = {
  skill_name: string;
  target_env: TargetEnv;
  dry_run?: boolean;
};

export type InstallSkillResult = {
  status: InstallSkillStatus;
  install_path: string;
  message: string;
  command?: string;
  source_path?: string;
};

const GITHUB_REPO = "https://github.com/KevinZai/commander.git";

function isTargetEnv(value: string): value is TargetEnv {
  return TARGET_ENVS.includes(value as TargetEnv);
}

function targetInstallPath(skillName: string, targetEnv: TargetEnv): string {
  switch (targetEnv) {
    case "claude-cli":
      return `~/.claude/skills/${skillName}`;
    case "claude-desktop":
      return `~/Library/Application Support/Claude/skills/${skillName}`;
    case "codex-cli":
      return `~/.codex/skills/${skillName}`;
    case "cursor":
      return `~/.cursor/skills/${skillName}`;
  }
}

function targetShellPath(skillName: string, targetEnv: TargetEnv): string {
  switch (targetEnv) {
    case "claude-cli":
      return `$HOME/.claude/skills/${skillName}`;
    case "claude-desktop":
      return `$HOME/Library/Application Support/Claude/skills/${skillName}`;
    case "codex-cli":
      return `${"${CODEX_HOME:-$HOME/.codex}"}/skills/${skillName}`;
    case "cursor":
      return `$HOME/.cursor/skills/${skillName}`;
  }
}

function shellDoubleQuote(value: string): string {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

function shellDoubleQuoteWithEnv(value: string): string {
  return `"${value.replace(/(["\\`])/g, "\\$1")}"`;
}

function buildInstallCommand(sourceDir: string, installPath: string): string {
  const repo = shellDoubleQuote(GITHUB_REPO);
  const source = shellDoubleQuote(sourceDir);
  const target = shellDoubleQuoteWithEnv(installPath);

  return [
    `TARGET=${target}`,
    `SOURCE=${source}`,
    `TMP_DIR="$(mktemp -d)"`,
    `if [ -d "$TARGET" ]; then echo "already-present: $TARGET"; else git clone --depth 1 --filter=blob:none --sparse ${repo} "$TMP_DIR/commander" && git -C "$TMP_DIR/commander" sparse-checkout set "$SOURCE" && mkdir -p "$(dirname "$TARGET")" && cp -R "$TMP_DIR/commander/$SOURCE" "$TARGET" && echo "installed: $TARGET"; fi`,
    `rm -rf "$TMP_DIR"`,
  ].join("; ");
}

export function installSkill(args: InstallSkillArgs): InstallSkillResult {
  if (!args.skill_name || typeof args.skill_name !== "string") {
    return {
      status: "error",
      install_path: "",
      message: "skill_name is required.",
    };
  }

  if (!isTargetEnv(args.target_env)) {
    return {
      status: "error",
      install_path: "",
      message: `Unsupported target_env '${String(args.target_env)}'. Expected one of: ${TARGET_ENVS.join(", ")}.`,
    };
  }

  const source = resolveSkillSource(args.skill_name);
  if (!source) {
    return {
      status: "error",
      install_path: "",
      message: `Skill '${args.skill_name}' was not found in the Commander catalog.`,
    };
  }

  const skillDirName = source.name;
  const installPath = targetInstallPath(skillDirName, args.target_env);
  const command = buildInstallCommand(source.sourceDir, targetShellPath(skillDirName, args.target_env));
  const status: InstallSkillStatus = args.dry_run ? "would-install" : "would-install";

  return {
    status,
    install_path: installPath,
    message: args.dry_run
      ? `Dry run: run the returned command to install '${skillDirName}' into ${args.target_env}.`
      : `MCP cannot execute shell directly. Run the returned command to install '${skillDirName}' into ${args.target_env}; it is idempotent and reports already-present when the target exists.`,
    command,
    source_path: source.sourceDir,
  };
}
