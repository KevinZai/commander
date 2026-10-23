#!/bin/sh
# Throwaway local Postgres only (never a real DB). Usage: sh supabase/tests/beta_v4_missing_tables_roundtrip.sh .
# Needs initdb/pg_ctl/psql on PATH (or PG_BIN). Checks, for 20261023180000_beta_v4_missing_tables:
#  1. live-like state (users/usage_counters uuid, no surveys/feedback/agent_messages): up, up again (no-op),
#     down, down again, up again; columns match beta_v4 except user_id uuid; RLS on; 5 policies; 6 indexes;
#     plus beta_v4's 5 users/usage_counters policies; all 10 policies equal beta_v4's with the ::text cast removed.
#  2. RLS behaves: a user sees/updates only their own users/usage_counters/surveys/feedback rows, never agent_messages.
#  3. full beta_v4 replay (what the GitHub integration does): up is a no-op.
#     3b. text beta_v4 with the users/usage_counters policies missing: up recreates them in beta_v4's ::text form.
#  4. guard: users.user_id text and tables missing -> raises, nothing created.
set -eu
R=${1:-.}; T=$(mktemp -d /tmp/neo-pg.XXXX); PGB=${PG_BIN:-$(dirname "$(command -v initdb)")}
PORT=${PG_PORT:-55441}
UP=$R/supabase/migrations/20261023180000_beta_v4_missing_tables.sql
DOWN=$R/supabase/rollbacks/20261023180000_beta_v4_missing_tables.down.sql
BETA=$R/supabase/migrations/20260417000000_beta_v4.sql
$PGB/initdb -D $T/d -U postgres -A trust >/dev/null
$PGB/pg_ctl -D $T/d -o "-p $PORT -k $T -c listen_addresses=''" -l $T/log -w start >/dev/null
trap "$PGB/pg_ctl -D $T/d -m fast stop >/dev/null; rm -rf $T" EXIT
export PGOPTIONS='-c client_min_messages=warning'
P="$PGB/psql -h $T -p $PORT -U postgres -q -v ON_ERROR_STOP=1 -X"
fail() { echo "FAIL: $*"; exit 1; }
eq() { [ "$2" = "$3" ] && echo "  ok  $1 = $2" || fail "$1: got '$2' want '$3'"; }
q() { $P -At -c "$1" | tr '\n' ' ' | sed 's/ $//'; }

AUTH="create schema auth;
create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid \$\$;
create function auth.role() returns text language sql stable as \$\$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'service_role') \$\$;
create role authenticated nologin; grant usage on schema auth to authenticated; grant usage on schema public to authenticated;"

# Live commander-mcp today: beta_v4's users + usage_counters with uuid user_id, get_effective_cap, pgcrypto.
LIVE="create extension if not exists pgcrypto;
create table users (user_id uuid primary key default gen_random_uuid(), email text unique,
  created_at timestamptz not null default now(), tier text not null default 'free' check (tier in ('free','pro')),
  license_key text unique, survey_skip_streak int not null default 0, surveys_answered int not null default 0,
  last_seen_at timestamptz);
create table usage_counters (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(user_id) on delete cascade, month text not null,
  calls_used int not null default 0, last_call_at timestamptz, unique (user_id, month));
alter table users enable row level security; alter table usage_counters enable row level security;"

TABLES="'surveys','feedback','agent_messages'"
cols() { q "select table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') from information_schema.columns where table_schema='public' and table_name in ($TABLES) order by 1"; }
state() {
  echo "  tables=$(q "select count(*) from pg_tables where schemaname='public' and tablename in ($TABLES)")" \
       "rls=$(q "select count(*) from pg_tables where schemaname='public' and tablename in ($TABLES) and rowsecurity")" \
       "policies=$(q "select count(*) from pg_policies where tablename in ($TABLES)")" \
       "indexes=$(q "select count(*) from pg_indexes where schemaname='public' and tablename in ($TABLES) and indexname not like '%_pkey'")" \
       "base_policies=$(q "select count(*) from pg_policies where tablename in ('users','usage_counters')")"
}
POLQ="select string_agg(tablename||'.'||policyname||'.'||cmd||':'||coalesce(qual,'')||'|'||coalesce(with_check,''), E'\n' order by tablename, policyname) from pg_policies where schemaname='public'"

echo "== reference: beta_v4 column shapes"
$P -c "$AUTH"; $P -f $BETA
REF=$(cols | sed 's/user_id:text/user_id:uuid/g')
REFPOL=$($P -At -c "$POLQ" | sed 's/(auth\.uid())::text/auth.uid()/g')
$P -c "drop schema public cascade; create schema public; grant usage on schema public to authenticated;"

echo "== 1. live-like state"
$P -c "$LIVE"
eq "tables before" "$(q "select count(*) from pg_tables where schemaname='public' and tablename in ($TABLES)")" 0
echo "up #1:"; $P -1 -f $UP
eq "state after up #1" "$(state)" "  tables=3 rls=3 policies=5 indexes=6 base_policies=5"
eq "columns match beta_v4 except user_id uuid ($(echo "$REF" | wc -w | tr -d ' ') cols)" "$(cols)" "$REF" >/dev/null && echo "  ok  columns match beta_v4 except user_id uuid ($(echo "$REF" | wc -w | tr -d ' ') cols)"
eq "user_id types" "$(q "select data_type from information_schema.columns where table_schema='public' and table_name in ('surveys','feedback') and column_name='user_id'")" "uuid uuid"
eq "policy names" "$(q "select policyname from pg_policies where tablename in ($TABLES) order by 1")" "agent_messages_service_only feedback_insert_service feedback_select_own surveys_insert_service surveys_select_own"
[ "$($P -At -c "$POLQ")" = "$REFPOL" ] && echo "  ok  all 10 policies = beta_v4's minus the ::text cast" || { echo "got:"; $P -At -c "$POLQ"; echo "want:"; echo "$REFPOL"; fail "policy definitions differ"; }
eq "no ::text cast left" "$(q "select count(*) from pg_policies where schemaname='public' and qual like '%::text = %user_id%'")" 0
U1=11111111-2222-4333-8444-555555555555; U2=22222222-3333-4444-8555-666666666666
$P -c "insert into users(user_id) values ('$U1'),('$U2');
insert into surveys(user_id,question_id,answer) values ('$U1',1,'a'),('$U2',2,'b');
insert into feedback(user_id,category,content) values ('$U1','bug','x'),('$U2','general','y');
insert into agent_messages(from_agent,to_agent,message) values ('a','b','{}');
insert into usage_counters(user_id,month) values ('$U1','2026-10'),('$U2','2026-10');"
echo "up #2 (must be a no-op, data kept):"; $P -1 -f $UP 2>$T/up2
grep -qi error $T/up2 && { cat $T/up2; fail "up #2 errored"; }
eq "state after up #2" "$(state)" "  tables=3 rls=3 policies=5 indexes=6 base_policies=5"
eq "rows kept" "$(q "select (select count(*) from surveys)||'/'||(select count(*) from feedback)||'/'||(select count(*) from agent_messages)")" "2/2/1"

echo "== 2. RLS as an authenticated user"
$P -c "grant select, update on users, usage_counters to authenticated; grant select on surveys, feedback, agent_messages to authenticated;"
AS="set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='$U1';"
eq "U1 sees own surveys" "$(q "$AS select answer from surveys order by 1")" "a"
eq "U1 sees own feedback" "$(q "$AS select content from feedback order by 1")" "x"
eq "U1 sees only own users row" "$(q "$AS select user_id from users")" "$U1"
eq "U1 sees only own usage row" "$(q "$AS select user_id from usage_counters")" "$U1"
eq "U1 cannot update U2" "$($P -At -c "$AS update users set tier='pro' where user_id='$U2' returning 1" | wc -l | tr -d ' ')" 0
eq "U1 can update self" "$($P -At -c "$AS update users set last_seen_at=now() where user_id='$U1' returning 1" | grep -c 1)" 1
eq "U1 sees no agent_messages" "$(q "$AS select count(*) from agent_messages")" "0"
eq "service_role sees all surveys" "$(q "select count(*) from surveys")" "2"
eq "get_effective_cap-style join (uuid = uuid)" "$(q "select count(*) from users u join surveys s using (user_id)")" "2"

echo "down #1:"; $P -1 -f $DOWN
eq "state after down" "$(state)" "  tables=0 rls=0 policies=0 indexes=0 base_policies=0"
eq "users/usage_counters untouched" "$(q "select count(*) from users")/$(q "select count(*) from pg_tables where tablename='usage_counters'")" "2/1"
echo "down #2 (rerunnable):"; $P -1 -f $DOWN 2>/dev/null && echo "  ok  down twice" || fail "down #2 errored"
echo "up #3 (after down):"; $P -1 -f $UP
eq "state after up #3" "$(state)" "  tables=3 rls=3 policies=5 indexes=6 base_policies=5"

echo "== 3. full beta_v4 replay (GitHub integration path): up is a no-op"
$P -c "drop schema public cascade; create schema public;"; $P -f $BETA
BEFORE=$(q "select string_agg(tablename||'.'||policyname||':'||coalesce(qual,'')||coalesce(with_check,''), ',' order by tablename, policyname) from pg_policies")
$P -1 -f $UP
eq "beta_v4 policies unchanged" "$(q "select string_agg(tablename||'.'||policyname||':'||coalesce(qual,'')||coalesce(with_check,''), ',' order by tablename, policyname) from pg_policies")" "$BEFORE"
eq "surveys.user_id still beta_v4 text" "$(q "select data_type from information_schema.columns where table_name='surveys' and column_name='user_id'")" "text"

echo "== 3b. text beta_v4, users/usage_counters policies missing: recreated with ::text"
$P -c "drop policy users_select_own on users; drop policy users_update_own on users; drop policy users_insert_service on users; drop policy usage_select_own on usage_counters; drop policy usage_upsert_service on usage_counters;"
$P -1 -f $UP
eq "beta_v4 policies restored verbatim" "$(q "select string_agg(tablename||'.'||policyname||':'||coalesce(qual,'')||coalesce(with_check,''), ',' order by tablename, policyname) from pg_policies")" "$BEFORE"

echo "== 4. guard: text users.user_id with tables missing"
$P -c "drop schema public cascade; create schema public; create table users (user_id text primary key);"
if $P -1 -f $UP 2>$T/err; then fail "guard did not raise"; fi
grep -o "beta_v4_missing_tables: .*" $T/err
eq "nothing created" "$(q "select count(*) from pg_tables where schemaname='public' and tablename in ($TABLES)")" 0
echo ALL-OK
