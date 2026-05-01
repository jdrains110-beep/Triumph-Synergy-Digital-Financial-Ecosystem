-- ─────────────────────────────────────────────────────────────────────────
-- TRIUMPH SYNERGY — APEX SECURITY: audit chain + RLS hardening
-- Migration: 0001_apex_audit_and_rls.sql
-- Apply with: psql $DATABASE_URL -f lib/db/migrations/0001_apex_audit_and_rls.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Tamper-evident append-only audit chain
create table if not exists audit_events (
  id          bigserial primary key,
  event_type  text not null,
  actor       text,
  payload     jsonb not null,
  prev_hash   text not null,
  hash        text not null unique,
  created_at  timestamptz not null default now()
);

create index if not exists audit_events_created_at_idx on audit_events (created_at desc);
create index if not exists audit_events_actor_idx       on audit_events (actor);
create index if not exists audit_events_type_idx        on audit_events (event_type);

-- Block UPDATE/DELETE entirely (append-only invariant)
create or replace function audit_events_block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

drop trigger if exists trg_audit_no_update on audit_events;
create trigger trg_audit_no_update
  before update or delete on audit_events
  for each row execute function audit_events_block_mutation();

alter table audit_events enable row level security;

drop policy if exists audit_insert_service on audit_events;
create policy audit_insert_service on audit_events
  for insert with check (auth.role() = 'service_role');

drop policy if exists audit_select_self on audit_events;
create policy audit_select_self on audit_events
  for select using (
    auth.role() = 'service_role'
    or actor = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Generic RLS template: lock every user-scoped table to its owner
-- (apply per-table; example for `profiles` and `payments` if present)
-- ─────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'profiles') then
    execute 'alter table profiles enable row level security';
    execute 'drop policy if exists profiles_self_rw on profiles';
    execute $p$create policy profiles_self_rw on profiles
              using (id = auth.uid()) with check (id = auth.uid())$p$;
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'payments') then
    execute 'alter table payments enable row level security';
    execute 'drop policy if exists payments_self_select on payments';
    execute $p$create policy payments_self_select on payments
              for select using (user_id = auth.uid())$p$;
    execute 'drop policy if exists payments_service_write on payments';
    execute $p$create policy payments_service_write on payments
              for all using (auth.role() = 'service_role')
              with check (auth.role() = 'service_role')$p$;
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Idempotency cross-instance store (optional — used when SUPABASE_IDEMPOTENCY=true)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists idempotency_cache (
  cache_key   text primary key,
  status      int  not null,
  body        text not null,
  headers     jsonb not null default '{}',
  body_hash   text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists idempotency_cache_expires_idx on idempotency_cache (expires_at);

alter table idempotency_cache enable row level security;
drop policy if exists idem_service_only on idempotency_cache;
create policy idem_service_only on idempotency_cache
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
