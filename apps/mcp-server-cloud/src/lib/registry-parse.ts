// Pure parsers for commander/core/registry.yaml and SKILL.md frontmatter.
// No I/O and no env/logger imports, so tools and tests can use them freely.

export type SkillEntry = {
  id: string;
  name: string;
  domain: string;
  tier: "free" | "pro";
  description: string;
  path: string;
};

function unquoteYaml(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v) as string;
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

/**
 * Parse the registry's top-level `skills:` section only. The agents:,
 * commands:, hooks: and vendors: sections also use `  - id:` items and must
 * not become skills.
 */
export function parseRegistrySkills(raw: string): SkillEntry[] {
  const skills: SkillEntry[] = [];
  let inSkills = false;
  let current: SkillEntry | null = null;

  for (const line of raw.split("\n")) {
    if (/^[A-Za-z_][\w-]*:/.test(line)) {
      if (current) skills.push(current);
      current = null;
      inSkills = /^skills:\s*$/.test(line);
      continue;
    }
    if (!inSkills) continue;

    const item = line.match(/^  - id:\s*(.+)$/);
    if (item) {
      if (current) skills.push(current);
      const id = unquoteYaml(item[1]);
      current = { id, name: id, domain: "general", tier: "free", description: "", path: "" };
      continue;
    }
    if (!current) continue;
    const field = line.match(/^    (name|path|domain|tier|description):\s*(.*)$/);
    if (!field) continue;
    const value = unquoteYaml(field[2]);
    if (field[1] === "name") current.name = value || current.id;
    else if (field[1] === "path") current.path = value;
    else if (field[1] === "domain") current.domain = value || "general";
    else if (field[1] === "tier") current.tier = value === "pro" ? "pro" : "free";
    else current.description = value;
  }
  if (current) skills.push(current);
  return skills;
}

/** `description:` from a SKILL.md frontmatter block (plain, quoted or folded). */
export function frontmatterDescription(content: string): string {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return "";
  const lines = m[1].split(/\r?\n/);
  const i = lines.findIndex((l) => /^description:/.test(l));
  if (i < 0) return "";
  const first = lines[i].replace(/^description:\s*/, "");
  if (/^[>|][+-]?\s*$/.test(first)) {
    const body: string[] = [];
    for (const l of lines.slice(i + 1)) {
      if (!/^\s+\S/.test(l)) break;
      body.push(l.trim());
    }
    return body.join(" ");
  }
  return unquoteYaml(first);
}
