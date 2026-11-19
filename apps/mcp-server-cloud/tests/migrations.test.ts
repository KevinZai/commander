/**
 * Static checks on migration text. There is no SQL harness in this repo and
 * tests never connect to a database, so these assert the properties a
 * reviewer would otherwise check by eye: every forward migration has a down,
 * statements are guarded for re-runs, and the security-relevant statements
 * are present. Manual verification steps: src/db/migrations/VERIFY.md.
 *
 * Run:  node --import tsx --test tests/migrations.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(APP_ROOT, "../..");
const MIGRATIONS = path.join(APP_ROOT, "src/db/migrations");
const DOWN = path.join(MIGRATIONS, "down");

function read(file: string): string {
  return readFileSync(file, "utf8");
}

/** SQL without `--` comments, lower-cased, whitespace collapsed. */
function sql(file: string): string {
  return read(file)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Every create table/index/policy/trigger/view statement must be re-runnable. */
function assertIdempotent(file: string): void {
  const text = sql(file);
  for (const m of text.matchAll(/create (unique )?index (?!if not exists)/g)) {
    assert.fail(`${path.basename(file)}: unguarded create index at ${m.index}`);
  }
  for (const m of text.matchAll(/create table (?!if not exists)/g)) {
    assert.fail(`${path.basename(file)}: unguarded create table at ${m.index}`);
  }
  for (const m of text.matchAll(/add column (?!if not exists)/g)) {
    assert.fail(`${path.basename(file)}: unguarded add column at ${m.index}`);
  }
  for (const m of text.matchAll(/drop (table|index|column|policy|trigger|view|function) (?!if exists)/g)) {
    assert.fail(`${path.basename(file)}: unguarded drop at ${m.index}`);
  }
  // create trigger / create policy have no IF NOT EXISTS: require a preceding
  // drop-if-exists or a pg_catalog existence check in the same file.
  if (/create trigger /.test(text)) {
    assert.match(text, /drop trigger if exists|from pg_trigger/, `${path.basename(file)}: create trigger needs a guard`);
  }
  if (/create policy /.test(text)) {
    assert.match(text, /drop policy if exists|from pg_policies/, `${path.basename(file)}: create policy needs a guard`);
  }
}

const forward = readdirSync(MIGRATIONS)
  .filter((f) => /^\d{3}_.+\.sql$/.test(f) && Number(f.slice(0, 3)) >= 3)
  .sort();

describe("hosted migrations (apps/mcp-server-cloud/src/db/migrations)", () => {
  it("has migration 003 onward", () => {
    assert.ok(forward.includes("003_stripe_events.sql"));
  });

  for (const file of forward) {
    it(`${file} has a down script and both are idempotent`, () => {
      const down = path.join(DOWN, file.replace(/\.sql$/, ".down.sql"));
      assert.ok(existsSync(down), `missing ${path.relative(APP_ROOT, down)}`);
      assertIdempotent(path.join(MIGRATIONS, file));
      assertIdempotent(down);
    });
  }

  it("003 records events before processing and protects lifetime Founders", () => {
    const text = sql(path.join(MIGRATIONS, "003_stripe_events.sql"));
    assert.match(text, /create table if not exists public\.stripe_events \( event_id text primary key/);
    assert.match(text, /processed_at timestamptz/);
    for (const column of ["lifetime_tier", "founders_payment_intent", "subscription_status", "subscription_event_created"]) {
      assert.match(text, new RegExp(`add column if not exists ${column} `));
    }
    assert.match(text, /create unique index if not exists users_founders_payment_intent_key/);
    assert.match(text, /revoke all on table public\.stripe_events from public, anon, authenticated/);
    assert.match(text, /if new\.lifetime_tier = 'founders' then new\.tier := 'founders'/);
  });

  it("004 drops the public creators policy and revokes anon RPC execute", () => {
    const text = sql(path.join(MIGRATIONS, "004_creators_lockdown.sql"));
    assert.match(text, /drop policy if exists creators_public_read on public\.creators/);
    assert.match(text, /revoke all on table public\.creators from anon, authenticated/);
    assert.match(text, /create or replace view public\.creators_public/);
    const view = text.slice(text.indexOf("create or replace view public.creators_public"), text.indexOf("$view$;"));
    for (const secret of ["email", "ls_affiliate_id", "total_commission_cents", "github_id,"]) {
      assert.ok(!view.includes(secret), `creators_public must not expose ${secret}`);
    }
    assert.match(view, /where approved_at is not null/);
    for (const fn of ["increment_usage", "get_effective_cap", "increment_creator_clicks"]) {
      assert.ok(text.includes(`'${fn}'`), `004 covers ${fn}`);
    }
    assert.match(text, /revoke execute on function %s from public, anon, authenticated/);
  });

  it("fresh-install SQL matches the 004 end-state", () => {
    const creators = sql(path.join(APP_ROOT, "src/db/creators-schema.sql"));
    assert.ok(!/create policy creators_public_read/.test(creators), "no public-read policy");
    assert.ok(!/to service_role, anon, authenticated/.test(creators), "no anon grant");
    const schema = sql(path.join(APP_ROOT, "src/db/schema.sql"));
    assert.match(schema, /revoke execute on function public\.increment_usage\(uuid, text\) from public, anon, authenticated/);
  });
});

describe("migrations are never applied by the repo's tooling", () => {
  it("supabase down scripts live outside supabase/migrations", () => {
    const supaMigrations = readdirSync(path.join(REPO_ROOT, "supabase/migrations"));
    assert.ok(supaMigrations.every((f) => !/\.down\.sql$/i.test(f)), "no down script inside supabase/migrations");
  });

  it("the users lockdown drops users_update_own and has a down in supabase/down", () => {
    const name = "20261119000000_users_update_lockdown";
    const forwardFile = path.join(REPO_ROOT, "supabase/migrations", `${name}.sql`);
    const downFile = path.join(REPO_ROOT, "supabase/down", `${name}.down.sql`);
    assert.ok(existsSync(downFile));
    assert.match(sql(forwardFile), /drop policy if exists "users_update_own" on public\.users/);
    assertIdempotent(forwardFile);
    assertIdempotent(downFile);
  });
});
