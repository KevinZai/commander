Create a pull request for the current branch.

Steps:
1. Check git status — commit any uncommitted changes
2. Push the current branch to origin
3. Create PR via `gh pr create` with:
   - Title from branch name or last commit
   - Body: summary of changes, files modified, test status
   - Labels: auto-detect from file paths (frontend, backend, docs, etc.)
4. If tests exist, run them first and include results in PR body
5. Output the PR URL

Args: $ARGUMENTS (optional: PR title override, target branch)
