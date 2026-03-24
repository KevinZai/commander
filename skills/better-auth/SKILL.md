# Better Auth Skill

Stack: `better-auth` + Drizzle adapter + Next.js App Router
**NOT NextAuth. NOT Clerk.** Better Auth is the auth library for all projects.

## Install

```bash
npm install better-auth
npm install better-auth/cli # for schema generation
```

---

## Server Config (`src/lib/auth.ts`)

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor, admin, magicLink } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      // organization plugin tables
      organization: schema.organizations,
      member: schema.members,
      invitation: schema.invitations,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: 'Verify your email', html: `<a href="${url}">Verify</a>` });
    },
    sendResetPasswordEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: 'Reset your password', html: `<a href="${url}">Reset</a>` });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      sendInvitationEmail: async ({ invitation, url }) => {
        await sendEmail({
          to: invitation.email,
          subject: `You've been invited to join ${invitation.organization.name}`,
          html: `<a href="${url}">Accept Invitation</a>`,
        });
      },
    }),
    twoFactor({
      issuer: 'MyApp',
      totpOptions: { digits: 6, period: 30 },
    }),
    admin(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, subject: 'Your magic link', html: `<a href="${url}">Sign in</a>` });
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh if >1 day old
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min client-side cache
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
});

export type Auth = typeof auth;
```

---

## Client Config (`src/lib/auth-client.ts`)

```ts
import { createAuthClient } from 'better-auth/react';
import { organizationClient, twoFactorClient, adminClient, magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [
    organizationClient(),
    twoFactorClient(),
    adminClient(),
    magicLinkClient(),
  ],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  organization,
} = authClient;
```

---

## API Route (`src/app/api/auth/[...all]/route.ts`)

```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth.handler);
```

---

## Database Schema (required tables)

Run Better Auth CLI to generate:
```bash
npx better-auth generate --output src/db/auth-schema.ts
```

Or use the schema from `drizzle-neon` skill → `schema-patterns.md` (users, sessions, accounts, verifications, organizations, members, invitations).

Custom fields on user:
```ts
export const users = pgTable('users', {
  // ... required Better Auth fields ...
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Custom fields
  role: text('role').default('user'), // app-level role
  onboardedAt: timestamp('onboarded_at'),
  stripeCustomerId: text('stripe_customer_id'),
});
```

Tell Better Auth about custom fields:
```ts
// In auth.ts
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user' },
      stripeCustomerId: { type: 'string', required: false },
    },
  },
  // ...
});
```

---

## Email/Password

```ts
// Sign up
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
  callbackURL: '/dashboard',
});

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'SecurePass123!',
  callbackURL: '/dashboard',
  rememberMe: true,
});

// Sign out
await authClient.signOut();

// Request password reset
await authClient.forgetPassword({
  email: 'user@example.com',
  redirectTo: '/auth/reset-password',
});

// Reset password (from reset link)
await authClient.resetPassword({
  newPassword: 'NewPass456!',
});

// Verify email resend
await authClient.sendVerificationEmail({
  email: 'user@example.com',
  callbackURL: '/dashboard',
});
```

---

## Social OAuth

```ts
// Google sign in
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
});

// GitHub sign in
await authClient.signIn.social({
  provider: 'github',
  callbackURL: '/dashboard',
  scopes: ['user:email', 'read:org'],
});
```

---

## Session Management

```tsx
// Client component — useSession hook
'use client';
import { useSession } from '@/lib/auth-client';

export function UserMenu() {
  const { data: session, isPending, error } = useSession();

  if (isPending) return <Spinner />;
  if (!session) return <SignInButton />;

  return <div>Hello {session.user.name}</div>;
}
```

```ts
// Server component / Server action — getSession
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

// In Server Component
export default async function Dashboard() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return <div>Welcome {session.user.name}</div>;
}

// In Server Action
'use server';
export async function updateProfile(data: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');
  // ... do work
}
```

---

## Middleware (`src/middleware.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/api/auth'];
const AUTH_ROUTES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and API auth routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const session = await getSessionCookie(request);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

---

## Organization (Multi-Tenant)

```ts
// Create org
await authClient.organization.create({
  name: 'Acme Corp',
  slug: 'acme-corp',
});

// Switch active org
await authClient.organization.setActive({ organizationId: org.id });

// Invite member
await authClient.organization.inviteMember({
  email: 'colleague@example.com',
  role: 'member',
  organizationId: org.id,
});

// Accept invitation (from email link)
await authClient.organization.acceptInvitation({ invitationId });

// List org members
const members = await authClient.organization.listMembers({ organizationId: org.id });

// Update member role
await authClient.organization.updateMemberRole({
  memberId: member.id,
  role: 'admin',
  organizationId: org.id,
});

// Server-side: get active org
const session = await auth.api.getSession({ headers: await headers() });
const activeOrgId = session?.session.activeOrganizationId;
```

---

## Two-Factor (TOTP)

```ts
// Enable 2FA
const { data } = await authClient.twoFactor.enable({ password: 'current-password' });
// data.totpURI — show as QR code
// data.backupCodes — store securely

// Verify TOTP code
await authClient.twoFactor.verifyTotp({ code: '123456' });

// Disable 2FA
await authClient.twoFactor.disable({ password: 'current-password' });

// During sign in (if 2FA required)
const result = await authClient.signIn.email({ email, password });
if (result.data?.twoFactorRedirect) {
  // Show TOTP input
  await authClient.twoFactor.verifyTotp({ code: totpInput });
}
```

---

## Admin Plugin

```ts
// Server-side admin operations
const users = await auth.api.listUsers({
  headers: await headers(),
  query: { limit: 20, offset: 0 },
});

await auth.api.banUser({ userId, reason: 'Violation' });
await auth.api.unbanUser({ userId });
await auth.api.impersonateUser({ userId }); // get session as that user
await auth.api.revokeUserSessions({ userId });
```

---

## Magic Link

```ts
await authClient.signIn.magicLink({
  email: 'user@example.com',
  callbackURL: '/dashboard',
});
```

---

## Role-Based Access (Server)

```ts
import { auth } from '@/lib/auth';

async function requireRole(role: 'admin' | 'owner') {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('Unauthorized');
  if (session.user.role !== role) throw new Error('Forbidden');
  return session;
}

// In a Server Action
export async function deleteOrganization(orgId: string) {
  const session = await requireRole('admin');
  await db.delete(organizations).where(eq(organizations.id, orgId));
}
```
