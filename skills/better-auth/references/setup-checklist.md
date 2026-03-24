# Better Auth Setup Checklist

## 1. Install Dependencies

```bash
npm install better-auth
npm install -D @types/better-auth  # if needed
```

## 2. Environment Variables

Add to `.env.local`:
```env
BETTER_AUTH_SECRET=<generate: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000  # or NEXT_PUBLIC_APP_URL

# Social providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (e.g. Resend)
RESEND_API_KEY=
```

## 3. Generate Auth Schema

```bash
npx better-auth generate
# Outputs migration SQL or schema.ts additions
```

Run the migration:
```bash
npm run db:migrate
# or
npm run db:push  # dev only
```

## 4. Create Auth Server (`src/lib/auth.ts`)

See SKILL.md → Server Config section.

## 5. Create Auth Client (`src/lib/auth-client.ts`)

See SKILL.md → Client Config section.

## 6. Mount API Route

Create `src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(auth.handler);
```

## 7. Add Middleware

Create `src/middleware.ts` — see SKILL.md → Middleware section.

## 8. Wrap App with Session Provider

```tsx
// src/app/layout.tsx or src/components/providers.tsx
import { SessionProvider } from '@/lib/auth-client';

export default function Layout({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

## 9. Test Auth Flow

- [ ] Sign up with email/password
- [ ] Receive verification email (check Resend logs)
- [ ] Verify email → redirect to dashboard
- [ ] Sign in
- [ ] Sign out
- [ ] Forgot password → receive email → reset
- [ ] Google OAuth sign in
- [ ] Protected route redirect when logged out
- [ ] `/api/auth/session` returns session JSON

## 10. Social Provider Setup

### Google
1. https://console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs: `{APP_URL}/api/auth/callback/google`

### GitHub
1. https://github.com/settings/developers → OAuth Apps → New
2. Authorization callback URL: `{APP_URL}/api/auth/callback/github`

## Common Issues

| Problem | Fix |
|---------|-----|
| Session not persisting | Check `BETTER_AUTH_URL` matches actual URL |
| Redirect loop in middleware | Add `/api/auth` to PUBLIC_ROUTES |
| Missing tables error | Run `npx better-auth generate` + migrate |
| CORS errors | Add `trustedOrigins` to auth config |
| Verification email not sending | Check email provider config + spam |
| Organization not in session | Use `sessionCaching: false` or refresh session |

## Plugin Install Order

Recommended order in `plugins: []`:
1. `organization()` — needed early for session org context
2. `twoFactor()` — before admin so admin can manage 2FA
3. `admin()` — last, wraps user management
4. `magicLink()` — standalone, any position

## Drizzle Adapter Notes

- Uses `provider: 'pg'` for Postgres (not 'sqlite', 'mysql')
- Schema keys must match exactly: `user`, `session`, `account`, `verification`
- Organization plugin adds: `organization`, `member`, `invitation`
- Custom schema fields → declare in `additionalFields` in auth config
