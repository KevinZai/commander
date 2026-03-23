Deploy the current project to staging or production.

Steps:
1. Run the full test suite: `pnpm test` (or detect test runner)
2. Build: `pnpm build`
3. Check TypeScript errors: `pnpm tsc --noEmit`
4. Git status — commit any uncommitted changes with conventional commit
5. Push to the appropriate branch
6. If Vercel project: `vercel --prod` or let git push trigger deploy
7. If PM2 service: `pm2 restart <name>`
8. Report: build status, deploy URL, any warnings

Args: $ARGUMENTS (e.g., "staging", "production", or service name)
