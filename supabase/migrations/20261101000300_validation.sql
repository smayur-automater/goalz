-- Server-side validation that column constraints can't express.
-- Clients validate too (shared Zod schemas), but the database is the last word.

create function private.validate_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_valid_timezone(new.timezone) then
    raise exception 'Unknown time zone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger validate_profile
  before insert or update of timezone on public.profiles
  for each row execute function private.validate_profile();

-- Check-ins: no future days, media only from the owner's own storage folder,
-- and a generous rate limit against runaway clients or abuse.
create function private.validate_check_in()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  recent integer;
begin
  -- UTC+14 is the furthest-ahead time zone, so allow one day past today in UTC.
  if new.local_date > (now() at time zone 'utc')::date + 1 then
    raise exception 'Check-ins cannot be in the future' using errcode = '22023';
  end if;

  if new.media_path is not null
     and split_part(new.media_path, '/', 1) <> new.profile_id::text then
    raise exception 'media_path must be inside your own folder' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into recent
    from public.check_ins
    where profile_id = new.profile_id
      and created_at > now() - interval '1 minute';
    if recent >= 120 then
      raise exception 'Too many check-ins. Please wait a minute.' using errcode = '54000';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_check_in
  before insert or update on public.check_ins
  for each row execute function private.validate_check_in();

-- Keep completed_at in step with status.
create function private.sync_goal_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger sync_goal_completion
  before insert or update of status on public.goals
  for each row execute function private.sync_goal_completion();

-- Server-managed columns on goals can't be set by clients.
create function private.protect_goal_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.approval_status := 'not_required';
    else
      new.approval_status := old.approval_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_goal_columns
  before insert or update on public.goals
  for each row execute function private.protect_goal_columns();

revoke execute on function private.validate_profile(), private.validate_check_in(),
  private.sync_goal_completion(), private.protect_goal_columns() from public;
