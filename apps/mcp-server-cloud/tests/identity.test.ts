/**
 * Hosted identity tests (Codex audit #09).
 *
 *   - License JWT revocation: the token's `kv` claim must match
 *     users.key_version, so rotating a user's key revokes old tokens.
 *   - OAuth subject resolution: email linking requires the issuer's
 *     email_verified claim; (iss, sub) bindings take precedence.
 *
 * Run:  node --import tsx --test tests/identity.test.ts
 *
 * The Supabase client is replaced with an in-memory query double; no network.
 */

import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long"; // cp-secret-ok: test-only fixture
process.env.NODE_ENV = "test";
process.env.OAUTH_ISSUER_URL = "https://issuer.example.com";

const { db } = await import("../src/db/client.js");
const { resolveLicenseToken, tokenKeyVersion } = await import("../src/middleware/auth.js");
const { resolveOAuthSubject, emailIsVerified } = await import("../src/mcp/oauth.js");

// ─── In-memory Supabase double ─────────────────────────────────────────────
type Row = Record<string, unknown>;
type Tables = { users: Row[]; oauth_identities: Row[] };
type QueryLog = { table: string; op: string; filters: Record<string, unknown>; columns?: string; row?: Row };

function mockDb(
  t: TestContext,
  tables: Tables,
  opts: { missingColumn?: string; failSelect?: keyof Tables; failUpsert?: boolean; raceBindTo?: string } = {}
): QueryLog[] {
  const log: QueryLog[] = [];
  t.mock.method(db, "from", (table: keyof Tables) => {
    const filters: Record<string, unknown> = {};
    let columns = "*";
    const query = {
      select(cols: string) {
        columns = cols;
        return query;
      },
      eq(column: string, value: unknown) {
        filters[column] = value;
        return query;
      },
      async maybeSingle() {
        log.push({ table, op: "select", filters: { ...filters }, columns });
        if (opts.failSelect === table) {
          return { data: null, error: { code: "57P01", message: "terminating connection" } };
        }
        if (opts.missingColumn && columns.includes(opts.missingColumn)) {
          return { data: null, error: { code: "42703", message: `column ${opts.missingColumn} does not exist` } };
        }
        const row = tables[table].find((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
        return { data: row ?? null, error: null };
      },
      async upsert(row: Row) {
        log.push({ table, op: "upsert", filters: {}, row });
        if (opts.failUpsert) return { error: { code: "57P01", message: "terminating connection" } };
        // Another request bound this subject first; ignoreDuplicates keeps its row.
        if (opts.raceBindTo) tables[table].push({ ...row, user_id: opts.raceBindTo });
        const exists = tables[table].some((r) => r.issuer === row.issuer && r.subject === row.subject);
        if (!exists) tables[table].push(row);
        return { error: null };
      },
    };
    return query;
  });
  return log;
}

const SECRET = process.env.JWT_SECRET!;
const USER_ID = "8a68e2f2-0000-4000-8000-0000000000aa";

// ─── License JWT revocation ────────────────────────────────────────────────
describe("license JWT key-version revocation", () => {
  it("a legacy token without kv is valid while the key has never been rotated", async (t) => {
    mockDb(t, { users: [{ user_id: USER_ID, tier: "pro", license_key: "lk_1", key_version: 1 }], oauth_identities: [] });
    const result = await resolveLicenseToken(jwt.sign({ sub: USER_ID }, SECRET));
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.auth.tier, "pro");
  });

  it("rotating the key (key_version 1 → 2) revokes tokens minted for the old key", async (t) => {
    mockDb(t, { users: [{ user_id: USER_ID, tier: "pro", license_key: "lk_2", key_version: 2 }], oauth_identities: [] });
    for (const token of [jwt.sign({ sub: USER_ID }, SECRET), jwt.sign({ sub: USER_ID, kv: 1 }, SECRET)]) {
      const result = await resolveLicenseToken(token);
      assert.deepEqual(result, { ok: false, status: 401, error: "Token revoked" });
    }
  });

  it("a token minted for the current key version is accepted", async (t) => {
    mockDb(t, { users: [{ user_id: USER_ID, tier: "free", license_key: "lk_2", key_version: 2 }], oauth_identities: [] });
    const result = await resolveLicenseToken(jwt.sign({ sub: USER_ID, kv: 2 }, SECRET));
    assert.equal(result.ok, true);
  });

  it("a malformed kv claim is rejected", async (t) => {
    mockDb(t, { users: [{ user_id: USER_ID, tier: "free", license_key: "lk", key_version: 1 }], oauth_identities: [] });
    const result = await resolveLicenseToken(jwt.sign({ sub: USER_ID, kv: "1" }, SECRET));
    assert.deepEqual(result, { ok: false, status: 401, error: "Invalid token payload" });
    assert.equal(tokenKeyVersion({ kv: 0 }), null);
    assert.equal(tokenKeyVersion({ kv: 1.5 }), null);
    assert.equal(tokenKeyVersion({}), 1);
  });

  it("a database without users.key_version falls back to the legacy lookup", async (t) => {
    const log = mockDb(
      t,
      { users: [{ user_id: USER_ID, tier: "pro", license_key: "lk" }], oauth_identities: [] },
      { missingColumn: "key_version" }
    );
    const result = await resolveLicenseToken(jwt.sign({ sub: USER_ID }, SECRET));
    assert.equal(result.ok, true);
    assert.equal(log.length, 2, "retried without key_version");
  });
});

// ─── OAuth subject resolution ──────────────────────────────────────────────
describe("OAuth subject resolution", () => {
  const ISS = "https://issuer.example.com";
  const victim = { user_id: USER_ID, tier: "founders", license_key: "lk_victim", email: "victim@example.com" };

  it("refuses to link by email when the issuer does not assert email_verified", async (t) => {
    const log = mockDb(t, { users: [{ ...victim }], oauth_identities: [] });
    for (const claims of [{}, { email_verified: false }, { email_verified: "false" }]) {
      const auth = await resolveOAuthSubject({ iss: ISS, sub: "auth0|attacker", email: victim.email, ...claims });
      assert.equal(auth, null);
    }
    assert.ok(
      !log.some((q) => q.table === "users" && q.filters.email !== undefined),
      "no users lookup by email for unverified addresses"
    );
    assert.ok(!log.some((q) => q.op === "upsert"), "no binding is created");
  });

  it("links a verified email and records the issuer + subject binding", async (t) => {
    const tables: Tables = { users: [{ ...victim }], oauth_identities: [] };
    mockDb(t, tables);
    const auth = await resolveOAuthSubject({ iss: ISS, sub: "auth0|owner", email: victim.email, email_verified: true });
    assert.equal(auth?.userId, USER_ID);
    assert.equal(auth?.tier, "founders");
    assert.deepEqual(tables.oauth_identities, [{ issuer: ISS, subject: "auth0|owner", user_id: USER_ID }]);
  });

  it("an existing binding wins over the email claim", async (t) => {
    const other = { user_id: "8a68e2f2-0000-4000-8000-0000000000bb", tier: "free", license_key: null, email: "other@example.com" };
    mockDb(t, {
      users: [{ ...victim }, other],
      oauth_identities: [{ issuer: ISS, subject: "auth0|owner", user_id: USER_ID }],
    });
    const auth = await resolveOAuthSubject({ iss: ISS, sub: "auth0|owner", email: other.email, email_verified: true });
    assert.equal(auth?.userId, USER_ID);
  });

  it("a binding from a different issuer does not apply", async (t) => {
    mockDb(t, {
      users: [{ ...victim }],
      oauth_identities: [{ issuer: "https://other-issuer.example.com", subject: "auth0|owner", user_id: USER_ID }],
    });
    const auth = await resolveOAuthSubject({ iss: ISS, sub: "auth0|owner" });
    assert.equal(auth, null);
  });

  it("a sub equal to a CC Commander user id resolves and binds", async (t) => {
    const tables: Tables = { users: [{ ...victim }], oauth_identities: [] };
    mockDb(t, tables);
    const auth = await resolveOAuthSubject({ iss: ISS, sub: USER_ID });
    assert.equal(auth?.userId, USER_ID);
    assert.equal(tables.oauth_identities.length, 1);
  });

  it("fails closed when the binding lookup errors: no email fallback", async (t) => {
    const log = mockDb(
      t,
      { users: [{ ...victim }], oauth_identities: [{ issuer: ISS, subject: "auth0|owner", user_id: USER_ID }] },
      { failSelect: "oauth_identities" }
    );
    const other = "other@example.com";
    const auth = await resolveOAuthSubject({ iss: ISS, sub: "auth0|owner", email: other, email_verified: true });
    assert.equal(auth, null, "an identity-table outage is an auth error, not 'no binding'");
    assert.ok(!log.some((q) => q.table === "users"), "no users lookup after a failed binding lookup");
    assert.ok(!log.some((q) => q.op === "upsert"), "no binding is written");
  });

  it("falls back to a verified email only after a confirmed empty binding lookup", async (t) => {
    const tables: Tables = { users: [{ ...victim }], oauth_identities: [] };
    const log = mockDb(t, tables);
    const auth = await resolveOAuthSubject({ iss: ISS, sub: "auth0|new", email: victim.email, email_verified: true });
    assert.equal(auth?.userId, USER_ID);
    assert.equal(log[0].table, "oauth_identities", "the binding is checked first");
  });

  it("a token without a subject never authenticates, even with a verified email", async (t) => {
    mockDb(t, { users: [{ ...victim }], oauth_identities: [] });
    assert.equal(await resolveOAuthSubject({ iss: ISS, email: victim.email, email_verified: true }), null);
  });

  it("refuses when the binding write fails", async (t) => {
    mockDb(t, { users: [{ ...victim }], oauth_identities: [] }, { failUpsert: true });
    assert.equal(await resolveOAuthSubject({ iss: ISS, sub: "auth0|owner", email: victim.email, email_verified: true }), null);
  });

  it("refuses when a concurrent request bound the subject to a different user", async (t) => {
    mockDb(t, { users: [{ ...victim }], oauth_identities: [] }, { raceBindTo: "8a68e2f2-0000-4000-8000-0000000000cc" });
    assert.equal(await resolveOAuthSubject({ iss: ISS, sub: "auth0|owner", email: victim.email, email_verified: true }), null);
  });

  it("emailIsVerified accepts boolean true and the string 'true' only", () => {
    assert.equal(emailIsVerified({ email_verified: true }), true);
    assert.equal(emailIsVerified({ email_verified: "true" }), true);
    assert.equal(emailIsVerified({ email_verified: 1 }), false);
    assert.equal(emailIsVerified({}), false);
  });
});
