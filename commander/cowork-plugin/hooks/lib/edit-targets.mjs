/**
 * edit-targets.mjs — one view of "which files does this tool call write, and with what text",
 * for both hosts that run these hooks.
 *
 * Claude Code edits files with Write / Edit / MultiEdit / NotebookEdit and puts the path in
 * `tool_input.file_path` (`notebook_path` for notebooks). Codex edits files with a single
 * `apply_patch` tool whose input is the raw patch text, so a handler that only reads
 * `tool_input.file_path` sees nothing and lets a Codex edit through unchecked (Codex audit #05).
 * Policies call editTargets(input) instead of reading the Claude fields directly.
 *
 * Codex patch grammar (codex-rs apply-patch):
 *   *** Begin Patch
 *   *** Add File: <path>        then "+"-prefixed lines (the whole new file)
 *   *** Update File: <path>     optional "*** Move to: <path>", then "@@" hunks of " ", "-", "+" lines
 *   *** Delete File: <path>
 *   *** End Patch
 * The patch arrives as `tool_input.command` (a string, or an argv array such as
 * ["apply_patch", "<patch>"]); `patch` / `input` fields and a bare string are accepted too, so a
 * shape change on the host side degrades to "still parsed" rather than "silently skipped".
 */

export const CLAUDE_EDIT_TOOLS = Object.freeze(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
export const CODEX_PATCH_TOOL = 'apply_patch';

const BEGIN_PATCH = '*** Begin Patch';

/** True for any tool call that writes files on either host. */
export function isFileEditTool(toolName) {
  return toolName === CODEX_PATCH_TOOL || CLAUDE_EDIT_TOOLS.includes(toolName);
}

/** The raw patch text inside a Codex apply_patch tool_input, or '' when there is none. */
export function extractPatchText(toolInput) {
  const candidates = [];
  if (typeof toolInput === 'string') candidates.push(toolInput);
  else if (toolInput && typeof toolInput === 'object') {
    for (const key of ['command', 'patch', 'input']) {
      const value = toolInput[key];
      if (typeof value === 'string') candidates.push(value);
      else if (Array.isArray(value)) candidates.push(...value.filter((v) => typeof v === 'string'));
    }
    for (const value of Object.values(toolInput)) {
      if (typeof value === 'string' && !candidates.includes(value)) candidates.push(value);
    }
  }
  const withMarker = candidates.find((text) => text.includes(BEGIN_PATCH));
  if (!withMarker) return '';
  // A shell heredoc form (`apply_patch <<'EOF' ... EOF`) keeps only the patch body.
  return withMarker.slice(withMarker.indexOf(BEGIN_PATCH));
}

/**
 * Parse Codex patch text into one entry per file operation:
 * { op: 'add'|'update'|'delete', path, movePath?, added } where `added` is the text of the
 * lines the patch adds (without their "+" prefix).
 */
export function parseApplyPatch(patchText) {
  const files = [];
  if (typeof patchText !== 'string' || !patchText) return files;
  let current = null;
  const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/;
  for (const line of patchText.split(/\r?\n/)) {
    const match = line.match(header);
    if (match) {
      current = { op: match[1].toLowerCase(), path: match[2].trim(), added: [] };
      files.push(current);
      continue;
    }
    if (!current) continue;
    const move = line.match(/^\*\*\* Move to: (.+)$/);
    if (move) {
      current.movePath = move[1].trim();
      continue;
    }
    if (line.startsWith('*** ')) continue; // End Patch, End of File
    if (line.startsWith('+')) current.added.push(line.slice(1));
  }
  return files.map((file) => ({ ...file, added: file.added.join('\n') }));
}

/**
 * Files a tool call writes, normalized across hosts: [{ path, content, op }].
 * `content` is the text the call writes into that file (Write content, Edit new_string, the
 * "+" lines of a patch). A Codex rename yields an entry for the destination as well. Deletes
 * are reported with op 'delete' and empty content. Non-edit tools return [].
 */
export function editTargets(input = {}) {
  const toolName = input.tool_name || input.toolName || '';
  const toolInput = input.tool_input ?? input.input ?? {};
  if (toolName === CODEX_PATCH_TOOL) {
    const targets = [];
    for (const file of parseApplyPatch(extractPatchText(toolInput))) {
      targets.push({ path: file.path, content: file.added, op: file.op });
      if (file.movePath) targets.push({ path: file.movePath, content: file.added, op: 'add' });
    }
    return targets;
  }
  if (!CLAUDE_EDIT_TOOLS.includes(toolName) || !toolInput || typeof toolInput !== 'object') return [];
  const filePath = toolInput.file_path || toolInput.notebook_path || toolInput.file || '';
  if (!filePath) return [];
  let content = '';
  if (toolName === 'Write') content = toolInput.content ?? '';
  else if (toolName === 'Edit') content = toolInput.new_string ?? '';
  else if (toolName === 'MultiEdit') {
    content = (Array.isArray(toolInput.edits) ? toolInput.edits : [])
      .map((edit) => edit?.new_string ?? '')
      .join('\n');
  } else if (toolName === 'NotebookEdit') content = toolInput.new_source ?? '';
  return [{ path: String(filePath), content: String(content), op: toolName === 'Write' ? 'add' : 'update' }];
}
