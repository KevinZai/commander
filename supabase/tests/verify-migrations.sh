#!/usr/bin/env bash
# Verify the migration chain on a DISPOSABLE local Postgres (15+).
#
# Builds three throwaway databases and runs the same role, quota and
# entitlement assertions (reconcile-assertions.sql) on each:
#   A  clean install via the chain: beta_v4 -> reconcile -> quota/stripe ->
#      claim tokens (each applied twice)
#   B  upgrade of a database built from the legacy hosted snapshot
#      (apps/mcp-server-cloud/src/db/schema.sql + 002 + creators-schema.sql)
#   C  upgrade of a database that already recorded 20261119000000 with its
#      tokenless Stripe claim RPCs (the file as reviewed at commit 4ee19ee),
#      holding an in-flight claim, to 20261120000000_stripe_claim_tokens
#
# It also checks the quota and Stripe RPCs (quota-stripe-assertions.sql) and
# runs, on each database, two concurrency checks with two live sessions: a duplicate Stripe event
# claim, and an older subscription event racing a newer one.
#
# It creates the cluster-wide roles anon, authenticated and service_role and
# drops databases named ccc_verify_a / ccc_verify_b / ccc_verify_c. NEVER point it at a
# Supabase project or any database you care about.
#
# Usage:
#   CCC_SQL_TEST_DISPOSABLE=1 PGHOST=/tmp/pgsock PGPORT=55432 PGUSER=postgres \
#     supabase/tests/verify-migrations.sh
set -euo pipefail

if [ "${CCC_SQL_TEST_DISPOSABLE:-}" != "1" ]; then
  echo "Refusing to run: set CCC_SQL_TEST_DISPOSABLE=1 to confirm the target Postgres is disposable." >&2
  exit 2
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
MIG="$ROOT/supabase/migrations"
APP="$ROOT/apps/mcp-server-cloud/src/db"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

admin() { "${PSQL[@]}" -d postgres "$@"; }

expect_denied() { # <db> <role> <sql>
  local out
  if out="$("${PSQL[@]}" -d "$1" -c "set role $2" -c "$3" 2>&1)"; then
    echo "FAIL: $2 was allowed: $3" >&2; exit 1
  fi
  grep -q "permission denied" <<<"$out" || { echo "FAIL: unexpected error: $out" >&2; exit 1; }
}

admin -c "drop database if exists ccc_verify_a" -c "drop database if exists ccc_verify_b" \
  -c "drop database if exists ccc_verify_c"
for role in anon authenticated service_role; do
  admin -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname = '$role') then
    execute format('create role %I nologin', '$role'); end if; end \$\$"
done
admin -c "alter role service_role bypassrls"
stub_db() { sed -n '/^create schema auth/,$p' "$HERE/supabase-stub.sql" | "${PSQL[@]}" -d "$1"; }
QUOTA_MIG="$MIG/20261119000000_quota_reserve_and_stripe_claims.sql"
TOKEN_MIG="$MIG/20261120000000_stripe_claim_tokens.sql"

# An applied migration version must never change: `db push` skips a version a
# database already recorded. 20261119000000 is pinned to its content at 4ee19ee.
QUOTA_REVIEWED="4ee19ee"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ccc-verify.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
QUOTA_MIG_4EE19EE="$WORK/20261119000000_at_4ee19ee.sql"
# Pinned git blob id of the reviewed file: checked unconditionally, so a
# shallow checkout without 4ee19ee cannot vouch for an edited migration.
QUOTA_REVIEWED_BLOB="a7a65c96313635a24613824d9a39529b8b57d087"
[ "$(git hash-object "$QUOTA_MIG")" = "$QUOTA_REVIEWED_BLOB" ] || {
  echo "FAIL: $QUOTA_MIG differs from its reviewed content ($QUOTA_REVIEWED); ship schema changes in a new migration" >&2; exit 1; }
cp "$QUOTA_MIG" "$QUOTA_MIG_4EE19EE"

# Two sessions: the first holds its transaction open while the second runs.
race() { # <db> <first sql> <second sql>  -> prints the second session's result
  "${PSQL[@]}" -d "$1" -c "begin" -c "$2" -c "select pg_sleep(1.5)" -c "commit" >/dev/null &
  local first=$!
  sleep 0.5
  "${PSQL[@]}" -At -d "$1" -c "set role service_role" -c "$3"
  wait "$first"
}
concurrency_checks() { # <db>
  "${PSQL[@]}" -d "$1" -c "insert into users (user_id, email, tier) values ('u-race', 'race@example.com', 'free') on conflict do nothing"
  local got
  got="$(race "$1" "select status from public.claim_stripe_event('evt_race', 'customer.subscription.updated')" \
               "select status from public.claim_stripe_event('evt_race', 'customer.subscription.updated')")"
  [ "$got" = "in_flight" ] || { echo "FAIL: concurrent duplicate claim returned '$got'" >&2; exit 1; }
  got="$(race "$1" "select public.apply_stripe_subscription('u-race', 'sub_r', 'canceled', '2026-11-01T00:00:20Z', false, true)" \
               "select result || ':' || tier from public.apply_stripe_subscription('u-race', 'sub_r', 'active', '2026-11-01T00:00:05Z', true, false)")"
  [ "$got" = "stale:free" ] || { echo "FAIL: older activation racing a cancel returned '$got'" >&2; exit 1; }
  "${PSQL[@]}" -d "$1" -c "do \$\$ begin
    assert (select tier from users where user_id = 'u-race') = 'free', 'cancel wins the race';
    assert (select stripe_subscription_status from users where user_id = 'u-race') = 'canceled', 'status kept';
  end \$\$"
  echo "  concurrency: duplicate claim in_flight, older event stale"
}

echo "== A: clean install through the chain"
admin -c "create database ccc_verify_a"
stub_db ccc_verify_a
"${PSQL[@]}" -d ccc_verify_a -f "$MIG/20260417000000_beta_v4.sql"
"${PSQL[@]}" -d ccc_verify_a -c "insert into users (user_id, email, tier) values ('fp-legacy', 'legacy@example.com', 'pro')"
"${PSQL[@]}" -d ccc_verify_a -f "$MIG/20261118000000_reconcile_hosted_schema.sql"
"${PSQL[@]}" -d ccc_verify_a -f "$MIG/20261118000000_reconcile_hosted_schema.sql"
"${PSQL[@]}" -d ccc_verify_a -c "do \$\$ begin
  assert (select tier from users where user_id = 'fp-legacy') = 'pro', 'legacy row kept';
end \$\$"
"${PSQL[@]}" -d ccc_verify_a -f "$QUOTA_MIG"
"${PSQL[@]}" -d ccc_verify_a -f "$QUOTA_MIG"
"${PSQL[@]}" -d ccc_verify_a -f "$TOKEN_MIG"
"${PSQL[@]}" -d ccc_verify_a -f "$TOKEN_MIG"
"${PSQL[@]}" -d ccc_verify_a -c "do \$\$ declare r record; begin
  select * into r from reserve_call('fp-legacy', '2026-11', 5);
  assert r.allowed and r.calls_used = 1, 'legacy fingerprint user can reserve';
end \$\$"
"${PSQL[@]}" -d ccc_verify_a -f "$HERE/reconcile-assertions.sql"
"${PSQL[@]}" -d ccc_verify_a -f "$HERE/quota-stripe-assertions.sql"
concurrency_checks ccc_verify_a

echo "== B: upgrade from the legacy hosted snapshot"
admin -c "create database ccc_verify_b"
stub_db ccc_verify_b
"${PSQL[@]}" -d ccc_verify_b -f "$APP/schema.sql"
"${PSQL[@]}" -d ccc_verify_b -f "$APP/migrations/002_paywall_tiers.sql"
"${PSQL[@]}" -d ccc_verify_b -f "$APP/creators-schema.sql"
"${PSQL[@]}" -d ccc_verify_b -f "$APP/creators-schema.sql"
expect_denied ccc_verify_b anon "select 1 from creators"
expect_denied ccc_verify_b anon "select get_effective_cap(gen_random_uuid())"
expect_denied ccc_verify_b authenticated "select increment_usage(gen_random_uuid(), '2026-11')"
echo "  snapshot files: creators closed, quota RPCs service-only"
UID_B="11111111-1111-4111-8111-111111111111"
"${PSQL[@]}" -d ccc_verify_b \
  -c "insert into users (user_id, email, tier, license_key) values ('$UID_B', 'h@example.com', 'founders', 'lk-h')" \
  -c "select increment_usage('$UID_B', '2026-10')"
# The uuid-only reserve_call that the earlier 003 file installed on such databases
"${PSQL[@]}" -d ccc_verify_b -c "create function public.reserve_call(p_user_id uuid, p_month text, p_cap integer)
  returns table (allowed boolean, calls_used integer) language sql as \$\$ select false, 0 \$\$"
"${PSQL[@]}" -d ccc_verify_b -f "$MIG/20261118000000_reconcile_hosted_schema.sql"
"${PSQL[@]}" -d ccc_verify_b -f "$MIG/20261118000000_reconcile_hosted_schema.sql"
"${PSQL[@]}" -d ccc_verify_b -c "do \$\$ begin
  assert (select calls_used from usage_counters where user_id = '$UID_B') = 1, 'usage kept across uuid->text';
  assert (select founders_granted_at is not null from users where user_id = '$UID_B'), 'founders backfilled';
  assert exists (select 1 from pg_constraint where conname = 'usage_counters_user_id_fkey'), 'fk restored';
end \$\$"
"${PSQL[@]}" -d ccc_verify_b -f "$QUOTA_MIG"
# A database that also ran the hand-applied 003 file converges on the same function and grants.
"${PSQL[@]}" -d ccc_verify_b -f "$APP/migrations/003_quota-reserve.sql"
"${PSQL[@]}" -d ccc_verify_b -f "$QUOTA_MIG"
"${PSQL[@]}" -d ccc_verify_b -f "$TOKEN_MIG"
"${PSQL[@]}" -d ccc_verify_b -c "do \$\$ declare r record; begin
  select * into r from reserve_call('$UID_B', '2026-10', 5);
  assert r.allowed and r.calls_used = 2, 'uuid-era user continues its count';
end \$\$"
"${PSQL[@]}" -d ccc_verify_b -f "$HERE/reconcile-assertions.sql"
"${PSQL[@]}" -d ccc_verify_b -f "$HERE/quota-stripe-assertions.sql"
concurrency_checks ccc_verify_b

echo "== C: upgrade from 20261119000000 as of $QUOTA_REVIEWED (tokenless claims)"
admin -c "create database ccc_verify_c"
stub_db ccc_verify_c
"${PSQL[@]}" -d ccc_verify_c -f "$MIG/20260417000000_beta_v4.sql"
"${PSQL[@]}" -d ccc_verify_c -f "$MIG/20261118000000_reconcile_hosted_schema.sql"
"${PSQL[@]}" -d ccc_verify_c -f "$QUOTA_MIG_4EE19EE"
# State left by the tokenless RPCs: one claim in flight (a worker on the old
# webhook mid-apply), one released, one completed.
"${PSQL[@]}" -d ccc_verify_c -c "set role service_role" -c "do \$\$ begin
  assert to_regprocedure('public.release_stripe_event(text)') is not null, 'starts from the tokenless RPCs';
  assert public.claim_stripe_event('evt_old_live', 'x') = 'claimed', 'old claim';
  assert public.claim_stripe_event('evt_old_done', 'x') = 'claimed', 'old claim to complete';
  perform public.complete_stripe_event('evt_old_done', 'x');
  assert public.claim_stripe_event('evt_old_gone', 'x') = 'claimed', 'old claim to release';
  perform public.release_stripe_event('evt_old_gone');
end \$\$"
"${PSQL[@]}" -d ccc_verify_c -f "$TOKEN_MIG"
"${PSQL[@]}" -d ccc_verify_c -f "$TOKEN_MIG"
"${PSQL[@]}" -d ccc_verify_c -c "set role service_role" -c "do \$\$ declare c record; t uuid; begin
  assert (select claim_token from public.stripe_event_claims where event_id = 'evt_old_live') is not null,
    'in-flight claim got a token';
  select * into c from public.claim_stripe_event('evt_old_live', 'x');
  assert c.status = 'in_flight', 'in-flight claim from the old RPC stays live until its lease ends';
  select * into c from public.claim_stripe_event('evt_old_done', 'x');
  assert c.status = 'processed', 'event completed by the old RPC stays processed';
  select * into c from public.claim_stripe_event('evt_old_gone', 'x');
  assert c.status = 'claimed' and c.claim_token is not null, 'released event can be claimed with a token';
  assert public.complete_stripe_event('evt_old_gone', 'x', c.claim_token), 'new owner completes';
  update public.stripe_event_claims set claimed_at = now() - interval '10 minutes' where event_id = 'evt_old_live';
  select * into c from public.claim_stripe_event('evt_old_live', 'x');
  assert c.status = 'claimed', 'expired pre-upgrade claim is taken over';
  t := c.claim_token;
  assert public.release_stripe_event('evt_old_live', t), 'takeover owner releases';
end \$\$"
echo "  upgrade: tokenless RPCs replaced, in-flight claim kept with a token"
"${PSQL[@]}" -d ccc_verify_c -f "$HERE/reconcile-assertions.sql"
"${PSQL[@]}" -d ccc_verify_c -f "$HERE/quota-stripe-assertions.sql"
concurrency_checks ccc_verify_c

admin -c "drop database ccc_verify_a" -c "drop database ccc_verify_b" -c "drop database ccc_verify_c"
echo "== migration chain verified"
