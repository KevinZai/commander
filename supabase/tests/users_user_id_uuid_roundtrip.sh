#!/bin/sh
# Throwaway local Postgres (never a real DB): beta_v4 -> up -> up (no-op) -> down -> up, the non-uuid guard,
# and a uuid-native schema (like live commander-mcp) where up must be a no-op.
# Usage: sh supabase/tests/users_user_id_uuid_roundtrip.sh . (needs initdb/pg_ctl/psql on PATH or PG_BIN)
set -eu
R=$1; T=$(mktemp -d /tmp/neo-pg.XXXX); PGB=${PG_BIN:-$(dirname "$(command -v initdb)")}
$PGB/initdb -D $T/d -U postgres >/dev/null; $PGB/pg_ctl -D $T/d -o "-p 55439 -k $T -c listen_addresses=''" -l $T/log -w start >/dev/null
trap "$PGB/pg_ctl -D $T/d -m fast stop >/dev/null; rm -rf $T" EXIT
P="$PGB/psql -h $T -p 55439 -U postgres -q -v ON_ERROR_STOP=1 -X"
$P -c "create schema auth; create function auth.uid() returns uuid language sql as \$\$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid \$\$; create function auth.role() returns text language sql as \$\$ select coalesce(current_setting('request.jwt.claim.role', true),'service_role') \$\$;"
$P -f $R/supabase/migrations/20260417000000_beta_v4.sql
U=11111111-2222-4333-8444-555555555555
$P -c "insert into users(user_id) values ('$U'); insert into surveys(user_id,question_id,answer) values ('$U',1,'x'),('$U',2,'y'); insert into usage_counters(user_id,month) values ('$U','2026-10');"
echo "up:";   $P -1 -f $R/supabase/migrations/20261023120000_users_user_id_uuid.sql
$P -At -c "select data_type from information_schema.columns where table_name in ('users','surveys','usage_counters','feedback') and column_name='user_id' order by table_name" | tr '\n' ' '; echo
$P -At -c "select get_effective_cap('$U'::uuid); select count(*) from users u join surveys s using(user_id) where u.user_id = '$U'::uuid;" | tr '\n' ' '; echo
echo "up twice (already uuid -> no-op):"; $P -1 -f $R/supabase/migrations/20261023120000_users_user_id_uuid.sql 2>$T/noop
grep -q "already uuid; no-op" $T/noop && echo noop-ok || { echo "NOOP FAILED"; cat $T/noop; exit 1; }
$P -At -c "select count(*) from pg_policies where tablename in ('users','surveys','usage_counters','feedback'); select get_effective_cap('$U'::uuid)" | tr '\n' ' '; echo
echo "down:"; $P -1 -f $R/supabase/rollbacks/20261023120000_users_user_id_uuid.down.sql
$P -At -c "select data_type from information_schema.columns where table_name in ('users','surveys','usage_counters','feedback') and column_name='user_id' order by table_name" | tr '\n' ' '; echo
$P -At -c "select get_effective_cap('$U'::text)"
echo "up again:"; $P -1 -f $R/supabase/migrations/20261023120000_users_user_id_uuid.sql && echo ok
echo "guard (non-uuid row must abort, no change):"
$P -1 -f $R/supabase/rollbacks/20261023120000_users_user_id_uuid.down.sql
$P -c "insert into users(user_id) values ('sha256-deadbeef')"
if $P -1 -f $R/supabase/migrations/20261023120000_users_user_id_uuid.sql 2>$T/err; then echo "GUARD FAILED"; exit 1; fi
grep -o "users_user_id_uuid: .*" $T/err
$P -At -c "select data_type from information_schema.columns where table_name='users' and column_name='user_id'"
echo "uuid-native schema (like live project) -> no-op:"
$P -c "drop schema public cascade; create schema public; create table users(user_id uuid primary key default gen_random_uuid());"
$P -1 -f $R/supabase/migrations/20261023120000_users_user_id_uuid.sql 2>$T/noop2
grep -q "already uuid; no-op" $T/noop2 && echo noop-native-ok || { echo "NATIVE NOOP FAILED"; cat $T/noop2; exit 1; }
echo ALL-OK
