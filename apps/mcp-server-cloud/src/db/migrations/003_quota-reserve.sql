-- Migration 003 — atomic monthly quota reservation (Codex audit #20).
-- Apply to EXISTING Supabase databases via SQL Editor (or `supabase db push`)
-- BEFORE deploying the server version that calls reserve_call: the middleware
-- fails closed (HTTP 503 quota_storage_unavailable) when this RPC is missing.
-- Idempotent — safe to re-run.
--
-- reserve_call(p_user_id, p_month, p_cap) counts ONE billable tool call:
--   - inserts the month row at 1, or increments it, in a single statement;
--   - the increment only happens while calls_used < p_cap, so concurrent
--     requests can never push the counter past the cap (row lock on conflict);
--   - returns allowed = false and the current count when the cap is reached,
--     without consuming quota.
-- What counts: the server reserves before dispatching an MCP `tools/call`
-- (or a legacy /v1/call `{tool}` body) for a known tool. Protocol requests
-- (initialize, tools/list, notifications, SSE) are not billed.

create or replace function public.reserve_call(p_user_id uuid, p_month text, p_cap integer)
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

  -- Conflict row existed and was at/over the cap: report it, consume nothing.
  select uc.calls_used into v_used
    from public.usage_counters uc
   where uc.user_id = p_user_id and uc.month = p_month;
  return query select false, coalesce(v_used, 0);
end;
$$;

revoke all on function public.reserve_call(uuid, text, integer) from public;
grant execute on function public.reserve_call(uuid, text, integer) to service_role;
