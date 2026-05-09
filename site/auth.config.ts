import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js v5 config — GitHub OAuth provider.
 *
 * Required env vars for full activation:
 *   AUTH_SECRET         — random 32-char secret (generate: `openssl rand -base64 32`)
 *   AUTH_GITHUB_ID      — GitHub OAuth App client ID
 *   AUTH_GITHUB_SECRET  — GitHub OAuth App client secret
 *
 * Fail-open: if GitHub env vars are absent, the provider is still registered
 * but GitHub OAuth flows will return an error. Pages check `session` for null
 * and render "Coming soon" copy instead of crashing.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email ?? `${profile.login}@github.invalid`,
          image: profile.avatar_url,
          // Store extra fields for creator signup
          login: profile.login,
          followers: profile.followers,
          public_repos: profile.public_repos,
        };
      },
    }),
  ],
  pages: {
    signIn: "/r/signup",
  },
  callbacks: {
    session({ session, token }) {
      if (token.login) {
        (session.user as Record<string, unknown>).login = token.login;
      }
      if (typeof token.followers === "number") {
        (session.user as Record<string, unknown>).followers = token.followers;
      }
      return session;
    },
    jwt({ token, profile }) {
      if (profile) {
        token.login = (profile as Record<string, unknown>).login;
        token.followers = (profile as Record<string, unknown>).followers;
      }
      return token;
    },
  },
};
