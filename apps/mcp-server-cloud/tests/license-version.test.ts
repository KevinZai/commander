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

  it("answers 503 when the lookup fails (e.g. migration 006 not applied)", async (t) => {
    t.mock.method(db, "from", () => {
      const query = {
        select() { return query; },
        eq() { return query; },
        async maybeSingle() { return { data: null, error: { code: "42703", message: "column users.license_key_version does not exist" } }; },
      };
      return query;
    });
    const res = await resolveLicenseToken(sign({ sub: "u1", kv: 1 }));
    assert.deepEqual(res, { ok: false, status: 503, error: "Auth backend unavailable" });
  });
});
