-- Foundation: private helper schema, enums, shared trigger functions.
-- The `private` schema is not exposed through the Data API, so nothing in it is
-- callable by clients directly.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create type public.age_mode as enum ('standard', 'teen', 'working', 'simple');
create type public.goal_type as enum ('target', 'habit', 'milestone', 'yesno');
create type public.goal_status as enum ('active', 'paused', 'completed', 'archived');
create type public.goal_privacy as enum ('private', 'shared');
create type public.goal_direction as enum ('increase', 'decrease');
create type public.goal_quantity as enum ('count', 'distance', 'weight', 'volume', 'currency', 'duration', 'none');
create type public.unit_system as enum ('metric', 'imperial');
create type public.theme_pref as enum ('light', 'dark', 'system');
create type public.family_role as enum ('parent', 'child');
create type public.approval_status as enum ('not_required', 'pending', 'approved', 'rejected');
create type public.check_in_source as enum ('manual', 'backfill', 'import');
create type public.reaction_kind as enum ('cheer', 'nudge');
create type public.entitlement_tier as enum ('free', 'premium');

-- Keeps updated_at honest regardless of what the client sends.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Habit frequency shape: {"period": "day"|"week"|"month", "times": 1..31, "days": [0..6]?}
create function private.is_valid_frequency(f jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- coalesce: a CHECK treats NULL as a pass, so missing keys must yield false, not NULL.
  select f is null or coalesce((
    jsonb_typeof(f) = 'object'
    and f ->> 'period' in ('day', 'week', 'month')
    and jsonb_typeof(f -> 'times') = 'number'
    and (f ->> 'times')::numeric between 1 and 31
    and (
      not f ? 'days'
      or (
        jsonb_typeof(f -> 'days') = 'array'
        and jsonb_array_length(f -> 'days') between 1 and 7
        and not exists (
          select 1 from jsonb_array_elements(f -> 'days') d
          where jsonb_typeof(d) <> 'number' or d::text::int not between 0 and 6
        )
      )
    )
  ), false);
$$;

create function private.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

revoke execute on function private.set_updated_at(), private.is_valid_frequency(jsonb),
  private.is_valid_timezone(text) from public;
-- Used by CHECK constraints and validation triggers, which run as the calling user.
grant execute on function private.is_valid_frequency(jsonb), private.is_valid_timezone(text)
  to authenticated, service_role;
