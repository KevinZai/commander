---
name: supabase-cli
description: Supabase CLI workflows — local dev, migrations, Edge Functions, type generation
category: backend
triggers:
  - supabase
  - database migration
  - edge function
  - supabase init
---

# Supabase CLI

Key workflows for the Supabase CLI in Claude Code sessions.

## When to Use
- Setting up a new Supabase project
- Running database migrations
- Deploying Edge Functions
- Generating TypeScript types from your schema

## Core Commands

### Project Setup
```bash
supabase init                          # Initialize project
supabase start                         # Start local dev (Docker required)
supabase status                        # Check local services
supabase stop                          # Stop local services
```

### Database Migrations
```bash
supabase migration new <name>          # Create migration file
supabase db diff --schema public       # Auto-generate migration from schema changes
supabase db push                       # Apply migrations to remote
supabase db reset                      # Reset local DB + re-run all migrations
supabase migration list                # List applied migrations
```

### Edge Functions
```bash
supabase functions new <name>          # Scaffold Edge Function
supabase functions serve               # Local dev server with hot reload
supabase functions deploy <name>       # Deploy to production
supabase functions deploy              # Deploy all functions
```

### Type Generation
```bash
supabase gen types typescript --local > types/supabase.ts    # From local DB
supabase gen types typescript --project-id <id> > types/supabase.ts  # From remote
```

### Linking & Auth
```bash
supabase link --project-ref <ref>      # Link to remote project
supabase login                         # Authenticate CLI
```

## Best Practices
- Always create migrations via `supabase db diff` rather than writing SQL by hand
- Run `supabase db reset` after pulling migration changes from teammates
- Generate types after every schema change to keep TypeScript in sync
- Use `supabase functions serve` for local testing before deploying
