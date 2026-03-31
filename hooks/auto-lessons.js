// ============================================================================
// Kevin Z's CC Commander — Auto Lessons (PostToolUse)
// ============================================================================
// Detects error patterns in tool output (error, failed, TypeError, etc.)
// and auto-appends entries to tasks/lessons.md in the current working directory.
// Creates the file and directory if they don't exist.
//
// Format: - [YYYY-MM-DD HH:mm] Auto-captured: {first 100 chars of error}
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const errorPatterns = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bTypeError\b/,
  /\bSyntaxError\b/,
  /\bReferenceError\b/,
  /\bRangeError\b/,
  /\bEMODULE/,
  /\bENOENT\b/,
  /\bEACCES\b/,
  /\bsegmentation fault\b/i,
  /\bpanic\b/i,
  /\bfatal\b/i,
  /\bunhandled\b/i,
];

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);

    // Check tool_output for error patterns
    const output = typeof input.tool_output === 'string'
      ? input.tool_output
      : JSON.stringify(input.tool_output || '');

    let hasError = false;
    let matchedLine = '';

    for (const pattern of errorPatterns) {
      if (pattern.test(output)) {
        hasError = true;
        // Find the first line that matches
        const lines = output.split('\n');
        for (const line of lines) {
          if (pattern.test(line)) {
            matchedLine = line.trim();
            break;
          }
        }
        break;
      }
    }

    if (hasError && matchedLine) {
      try {
        const tasksDir = path.join(process.cwd(), 'tasks');
        const lessonsFile = path.join(tasksDir, 'lessons.md');

        if (!fs.existsSync(tasksDir)) {
          fs.mkdirSync(tasksDir, { recursive: true });
        }

        const now = new Date();
        const ts = now.toISOString().replace('T', ' ').substring(0, 16);
        const summary = matchedLine.substring(0, 100);
        const entry = `- [${ts}] Auto-captured: ${summary}\n`;

        let existing = '';
        try {
          existing = fs.readFileSync(lessonsFile, 'utf8');
        } catch {
          // File doesn't exist — will create
          existing = '# Lessons Learned\n\n';
        }

        fs.writeFileSync(lessonsFile, existing + entry);
      } catch {
        // Can't write lessons — not critical
      }
    }

    console.log(data);
  } catch (e) {
    // Silent fail — never block tool execution
    console.log(data);
  }
});
