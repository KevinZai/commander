/**
 * License key versioning (M7a): a license JWT is valid only for the user's
 * current users.license_key_version. Offline — the Supabase client is doubled.
 *
 * Run:  node --import tsx --test tests/license-version.test.ts
 */

import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token"; // cp-secret-ok: test-only fixture
process.env.JWT_SECRET = "test-jwt-secret-min-32-characters-long"; // cp-secret-ok: test-only fixture
process.env.NODE_ENV = "test";

const { resolveLicenseToken } = await import("../src/middleware/auth.js");
const { db } = await import("../src/db/client.js");

function mockUser(t: TestContext, row: Record<string, unknown> | null): string[] {
  const selected: string[] = [];
  t.mock.method(db, "from", () => {
    const query = {
      select(cols: string) { selected.push(cols); return query; },
      eq() { return query; },
      async maybeSingle() { return { data: row, error: null }; },
    };
    return query;
  });
  return selected;
}

function sign(claims: Record<string, unknown>): string {
  return jwt.sign(claims, process.env.JWT_SECRET!);
}

describe("license key version (kv claim)", () => {
  it("accepts a token whose kv matches the current version and selects the column", async (t) => {
    const selected = mockUser(t, { user_id: "u1", tier: "pro", license_key: "lk", license_key_version: 3 });
    const res = await resolveLicenseToken(sign({ sub: "u1", kv: 3 }));
    assert.equal(res.ok, true);
    assert.match(selected[0], /license_key_version/);
  });

  it("rejects a stale token after rotation", async (t) => {
    mockUser(t, { user_id: "u1", tier: "pro", license_key: "lk", license_key_version: 3 });
    const res = await resolveLicenseToken(sign({ sub: "u1", kv: 2 }));
    assert.deepEqual(res, { ok: false, status: 401, error: "Token revoked" });
  });

  it("accepts a legacy token without kv only while the version is 1", async (t) => {
    mockUser(t, { user_id: "u1", tier: "free", license_key: "lk", license_key_version: 1 });
    assert.equal((await resolveLicenseToken(sign({ sub: "u1" }))).ok, true);
  });

  it("rejects a legacy token without kv once the key was rotated", async (t) => {
    mockUser(t, { user_id: "u1", tier: "free", license_key: "lk", license_key_version: 2 });
    const res = await resolveLicenseToken(sign({ sub: "u1" }));
    assert.deepEqual(res, { ok: false, status: 401, error: "Token revoked" });
  });

  it("rejects a malformed kv before any lookup", async (t) => {
    const selected = mockUser(t, { user_id: "u1", tier: "free", license_key: "lk", license_key_version: 1 });
    for (const kv of [0, -1, 1.5, "1", null]) {
      const res = await resolveLicenseToken(sign({ sub: "u1", kv }));
      assert.deepEqual(res, { ok: false, status: 401, error: "Invalid token payload" }, `kv=${String(kv)}`);
    }
    assert.equal(selected.length, 0);
  });

  it("answers 503 when the lookup fails", async (t) => {
    t.mock.method(db, "from", () => {
      const query = {
        select() { return query; },
        eq() { return query; },
        async maybeSingle() { return { data: null, error: { code: "08006", message: "connection failure" } }; },
      };
      return query;
    });
    const res = await resolveLicenseToken(sign({ sub: "u1", kv: 1 }));
    assert.deepEqual(res, { ok: false, status: 503, error: "Auth backend unavailable" });
  });
});

/** A users table from before migration 006: selecting license_key_version is 42703. */
function mockPre006(t: TestContext, row: Record<string, unknown>, fallbackError: unknown = null): string[] {
  const selected: string[] = [];
  t.mock.method(db, "from", () => {
    let cols = "";
    const query = {
      select(c: string) { cols = c; selected.push(c); return query; },
      eq() { return query; },
      async maybeSingle() {
        if (cols.includes("license_key_version")) {
          return { data: null, error: { code: "42703", message: "column users.license_key_version does not exist" } };
        }
        return fallbackError ? { data: null, error: fallbackError } : { data: row, error: null };
      },
    };
    return query;
  });
  return selected;
}

describe("license key version before migration 006 is applied", () => {
  it("falls back to the select without the column and treats the version as 1", async (t) => {
    const selected = mockPre006(t, { user_id: "u1", tier: "pro", license_key: "lk" });
    const res = await resolveLicenseToken(sign({ sub: "u1" }));
    assert.equal(res.ok, true);
    assert.equal(selected.length, 2);
    assert.match(selected[0], /license_key_version/);
    assert.doesNotMatch(selected[1], /license_key_version/);
    assert.equal((await resolveLicenseToken(sign({ sub: "u1", kv: 1 }))).ok, true);
  });

  it("rejects a kv above 1 while the column is missing", async (t) => {
    mockPre006(t, { user_id: "u1", tier: "pro", license_key: "lk" });
    const res = await resolveLicenseToken(sign({ sub: "u1", kv: 2 }));
    assert.deepEqual(res, { ok: false, status: 401, error: "Token revoked" });
  });

  it("answers 503 when the fallback select also fails", async (t) => {
    mockPre006(t, { user_id: "u1" }, { code: "08006", message: "connection failure" });
    const res = await resolveLicenseToken(sign({ sub: "u1" }));
    assert.deepEqual(res, { ok: false, status: 503, error: "Auth backend unavailable" });
  });
});
