// ============================================================================
// Kevin Z's CC Commander — Session End Verify (Stop)
// ============================================================================
// On session Stop, checks if files were modified via git diff --stat.
// Reports modified file count and checks for console.log in JS/TS files.
// ============================================================================

'use strict';

const { execSync } = require('child_process');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    // Pass through (required by hook protocol)
    console.log(data);

    let diffOutput = '';
    try {
      diffOutput = execSync('git diff --stat', {
        cwd: process.cwd(),
        timeout: 5000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // Not a git repo or git not available — skip
      return;
    }

    if (!diffOutput.trim()) return;

    // Count modified files
    const lines = diffOutput.trim().split('\n');
    // Last line is summary, file lines are everything else
    const fileLines = lines.slice(0, -1).filter(l => l.includes('|'));
    const fileCount = fileLines.length;

    if (fileCount === 0) return;

    // Check for console.log in modified JS/TS files
    let consoleLogCount = 0;
    try {
      const modifiedFiles = execSync('git diff --name-only', {
        cwd: process.cwd(),
        timeout: 5000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim().split('\n').filter(Boolean);

      const jstsFiles = modifiedFiles.filter(f =>
        /\.(js|ts|jsx|tsx|mjs|mts)$/.test(f)
      );

      for (const file of jstsFiles) {
        try {
          const diff = execSync(`git diff -- "${file}"`, {
            cwd: process.cwd(),
            timeout: 5000,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
          for (const line of added) {
            if (/console\.log/.test(line)) consoleLogCount++;
          }
        } catch {
          // Can't read diff for this file — skip
        }
      }
    } catch {
      // Can't get file list — skip console.log check
    }

    const parts = [`${fileCount} file${fileCount === 1 ? '' : 's'} changed`];
    if (consoleLogCount > 0) {
      parts.push(`${consoleLogCount} console.log${consoleLogCount === 1 ? '' : 's'} found`);
    }
    parts.push('Run /verify for full check');

    process.stderr.write(`[session-verify] ${parts.join(' | ')}\n`);
  } catch (e) {
    // Silent fail — hooks should never break Claude
    console.log(data);
  }
});
