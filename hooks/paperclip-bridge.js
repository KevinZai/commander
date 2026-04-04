// ============================================================================
// Paperclip Bridge — Claude Code Bible (Kevin's Overlay)
// ============================================================================
// PreToolUse + PostToolUse hook for Paperclip integration.
// - Detects active Paperclip issue from branch name or environment
// - Injects issue IDs into git commit messages
// - Updates Paperclip issue status on successful code changes
// ============================================================================

'use strict';

const PAPERCLIP_API = process.env.PAPERCLIP_API || 'http://localhost:3110';

function extractIssueId(branchName) {
  const match = branchName.match(/cc-(\d+)/i);
  return match ? `CC-${match[1]}` : null;
}

async function updateIssueStatus(issueId, status) {
  try {
    const response = await fetch(`${PAPERCLIP_API}/api/issues/${issueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      console.error(`[paperclip-bridge] Failed to update ${issueId}: ${response.status}`);
    }
  } catch (err) {
    // Paperclip may not be running — fail silently
  }
}

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(data);
    const toolName = input.tool_name || '';
    const toolInput = input.tool_input || {};

    // PostToolUse: after successful git commit, update Paperclip
    if (toolName === 'Bash' && toolInput.command) {
      const cmd = toolInput.command;

      if (cmd.includes('git commit')) {
        const issueId = process.env.PAPERCLIP_ISSUE_ID || extractIssueId(process.env.GIT_BRANCH || '');
        if (issueId) {
          await updateIssueStatus(issueId, 'in_progress');
        }
      }
    }

    // Pass through
    console.log(data);
  } catch (e) {
    console.log(data);
  }
});
