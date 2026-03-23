Activate careful/safety mode for this session.

When active:
- BLOCK all destructive commands: `rm -rf`, `DROP TABLE/DATABASE`, `git push --force`, `kubectl delete`, `docker system prune`, `pm2 delete all`
- REQUIRE explicit confirmation before: file deletion, database mutations, production deploys, config changes
- SHOW diffs before any file write
- LOG all commands to a session audit trail

Say "I've activated careful mode" and apply these constraints for the rest of this session.
Deactivate with `/careful off`.
