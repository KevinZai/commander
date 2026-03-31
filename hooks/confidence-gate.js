// ============================================================================
// Kevin Z's CC Commander — Confidence Gate (PreToolUse, matcher: Bash)
// ============================================================================
// Detects bash commands that create or edit 3+ files in a single command
// (e.g., sed -i on multiple files, scripts touching many files).
// Warns but does NOT block (exit 0) — informational only.
// ============================================================================

'use strict';

const multiFilePatterns = [
  // sed -i with glob or multiple files
  /sed\s+-i[^\|;]*\s+\S+\s+\S+\s+\S+/,
  // find ... -exec (modifying commands)
  /find\s+.*-exec\s+(sed|rm|chmod|chown|mv|cp)/,
  // xargs with modifying commands
  /xargs\s+.*(sed|rm|chmod|chown|mv|cp)/,
  // for loop touching files
  /for\s+\w+\s+in\s+.*;\s*do\s+.*(sed|rm|chmod|chown|mv|cp|echo\s+.*>)/,
  // Multiple redirects in one command
  />\s*\S+.*>\s*\S+.*>\s*\S+/,
  // rename/perl-rename
  /\brename\s+/,
  // glob with sed -i
  /sed\s+-i\s+.*\*\./,
  // Multiple file args to sed
  /sed\s+-i\s+'[^']*'\s+\S+\s+\S+\s+\S+/,
];

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = input.tool_input?.command || '';

    for (const pattern of multiFilePatterns) {
      if (pattern.test(cmd)) {
        process.stderr.write(`[confidence-gate] Multi-file operation detected. Verify intent before proceeding.\n`);
        break;
      }
    }

    // Always allow through (exit 0)
    console.log(data);
  } catch (e) {
    // Silent fail — allow through
    console.log(data);
  }
});
