-- Account lifecycle: sign-up provisioning and data export.
-- Account deletion is handled by the delete-account Edge Function: deleting the
-- auth user cascades through profiles to every user-owned row.

-- On sign-up: create the profile, copy the default life areas, and add a free entitlement.
-- Locale and time zone come from sign-up metadata when valid, otherwise Australian defaults.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  tz text := meta ->> 'timezone';
  loc text := meta ->> 'locale';
  new_profile_id uuid;
begin
  insert into public.profiles (auth_user_id, display_name, timezone, locale)
  values (
    new.id,
    nullif(left(btrim(meta ->> 'display_name'), 50), ''),
    case when tz is not null and private.is_valid_timezone(tz) then tz else 'Australia/Sydney' end,
    case when loc ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then loc else 'en-AU' end
  )
  returning id into new_profile_id;

  insert into public.life_areas (profile_id, default_key, icon, color_token, sort_order)
  select new_profile_id, d.key, d.icon, d.color_token, d.sort_order
  from public.life_area_defaults d;

  insert into public.entitlements (profile_id) values (new_profile_id);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Everything the signed-in user owns, as one JSON document (GDPR / APP 12 access request).
-- SECURITY INVOKER: Row Level Security decides what is returned, so it can only ever be your data.
-- The app turns this into JSON and CSV files for download.
create function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (select private.current_profile_id() as id)
  select jsonb_build_object(
    'exported_at', now(),
    'format_version', 1,
    'profile', (select to_jsonb(p) - 'auth_user_id' from public.profiles p, me where p.id = me.id),
    'life_areas', coalesce((select jsonb_agg(to_jsonb(a) order by a.sort_order) from public.life_areas a, me where a.profile_id = me.id), '[]'),
    'goals', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at) from public.goals g, me where g.profile_id = me.id), '[]'),
    'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.goal_id, m.position) from public.milestones m, me where m.profile_id = me.id), '[]'),
    'check_ins', coalesce((select jsonb_agg(to_jsonb(c) order by c.occurred_at) from public.check_ins c, me where c.profile_id = me.id), '[]'),
    'reminders', coalesce((select jsonb_agg(to_jsonb(r)) from public.reminders r, me where r.profile_id = me.id), '[]'),
    'reflections', coalesce((select jsonb_agg(to_jsonb(r) order by r.week_start) from public.reflections r, me where r.profile_id = me.id), '[]'),
    'achievements', coalesce((select jsonb_agg(to_jsonb(u) order by u.earned_at) from public.user_achievements u, me where u.profile_id = me.id), '[]')
  );
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function private.current_profile_id() to authenticated;
