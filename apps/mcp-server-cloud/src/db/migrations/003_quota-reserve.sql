-- Migration 003 — atomic monthly quota reservation (Codex audit #19/#20).
--
-- SUPERSEDED by the ordered chain: the canonical copy of this function is
-- supabase/migrations/20261119000000_quota_reserve_and_stripe_claims.sql,
-- applied by `supabase db push` after 20261118000000_reconcile_hosted_schema.sql.
-- This file is kept identical to that section so a database that already ran
-- it by hand converges on the same signature and grants. Run it only AFTER the
-- reconcile migration (users.user_id must be TEXT). Idempotent.
--
-- What counts: the server reserves before dispatching an MCP `tools/call`
-- (or a legacy /v1/call `{tool}` body) for a known tool. Protocol requests
-- (initialize, tools/list, notifications, SSE) are not billed.

-- A uuid overload from the superseded apps/mcp-server-cloud/src/db/migrations
-- /003_quota-reserve.sql would make PostgREST's named-argument call ambiguous.
drop function if exists public.reserve_call(uuid, text, integer);

-- Counts ONE billable tool call for (user, month):
--   - inserts the month row at 1, or increments it, in a single statement;
--   - the increment only happens while calls_used < p_cap, so concurrent
--     requests can never push the counter past the cap (row lock on conflict);
--   - returns allowed = false and the current count when the cap is reached,
--     without consuming quota.
create or replace function public.reserve_call(p_user_id text, p_month text, p_cap integer)
returns table (allowed boolean, calls_used integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_used integer;
begin
  if p_cap is null or p_cap <= 0 then
    select uc.calls_used into v_used
      from public.usage_counters uc
     where uc.user_id = p_user_id and uc.month = p_month;
    return query select false, coalesce(v_used, 0);
    return;
  end if;

  insert into public.usage_counters as uc (user_id, month, calls_used, last_call_at)
  values (p_user_id, p_month, 1, now())
  on conflict (user_id, month)
  do update set
    calls_used   = uc.calls_used + 1,
    last_call_at = now()
  where uc.calls_used < p_cap
  returning uc.calls_used into v_used;

  if found then
    return query select true, v_used;
    return;
  end if;

  -- The row existed and was at or over the cap: report it, consume nothing.
  select uc.calls_used into v_used
    from public.usage_counters uc
   where uc.user_id = p_user_id and uc.month = p_month;
  return query select false, coalesce(v_used, 0);
end;
$$;

revoke all on function public.reserve_call(text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_call(text, text, integer) to service_role;
