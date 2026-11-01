-- Row Level Security.
-- Rules:
--   1. Users can read and write only their own data.
--   2. Parents can read and write their linked, parent-managed children's data (Phase 2 hook).
--   3. Accountability buddies get read-only access to goals explicitly shared with them (Phase 2 hook).
--   4. Reference tables are readable by everyone, writable by no client.
-- Helper functions are SECURITY DEFINER so policies don't recurse through RLS,
-- and live in the unexposed `private` schema.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where auth_user_id = (select auth.uid());
$$;

-- True if the current user is a parent in the same family as a parent-managed profile.
create function private.is_guardian_of(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members parent
    join public.family_members child
      on child.group_id = parent.group_id and child.role = 'child'
    join public.profiles p on p.id = child.profile_id and p.is_managed
    where parent.profile_id = private.current_profile_id()
      and parent.role = 'parent'
      and child.profile_id = target
  );
$$;

create function private.can_manage(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target is not null
    and (target = private.current_profile_id() or private.is_guardian_of(target));
$$;

-- Buddy access: an accepted, unrevoked share of a goal marked 'shared'.
create function private.is_buddy_of_goal(target_goal uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shares s
    join public.goals g on g.id = s.goal_id
    where s.goal_id = target_goal
      and s.buddy_profile_id = private.current_profile_id()
      and s.accepted_at is not null
      and s.revoked_at is null
      and g.privacy = 'shared'
      and g.deleted_at is null
  );
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.current_profile_id(),
  private.is_guardian_of(uuid),
  private.can_manage(uuid),
  private.is_buddy_of_goal(uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere, and remove anonymous access to user data entirely.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

revoke all on
  public.profiles, public.family_groups, public.family_members, public.parental_consents,
  public.entitlements, public.life_areas, public.goals, public.milestones, public.check_ins,
  public.reminders, public.reflections, public.user_achievements, public.shares, public.reactions
from anon;

-- ---------------------------------------------------------------------------
-- Reference data: read-only for everyone
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate on
  public.region_rules, public.life_area_defaults, public.goal_templates, public.achievements
from anon, authenticated;

create policy "Anyone can read region rules" on public.region_rules
  for select to anon, authenticated using (true);
create policy "Anyone can read life area defaults" on public.life_area_defaults
  for select to anon, authenticated using (true);
create policy "Anyone can read goal templates" on public.goal_templates
  for select to anon, authenticated using (true);
create policy "Anyone can read achievements" on public.achievements
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- Profiles are created by the sign-up trigger and deleted with the auth user.
-- Clients may update only these columns; ownership and family links are locked.
revoke insert, update, delete on public.profiles from authenticated;
grant update (
  display_name, avatar_path, age_mode, birth_year, locale, timezone, region, currency,
  units, week_start, theme, text_scale, quiet_start, quiet_end, reflection_day,
  reflection_time, analytics_opt_in, prefs, onboarded_at
) on public.profiles to authenticated;

create policy "Read own or managed profiles" on public.profiles
  for select to authenticated using ((select private.can_manage(id)));
create policy "Update own or managed profiles" on public.profiles
  for update to authenticated
  using ((select private.can_manage(id)))
  with check ((select private.can_manage(id)));

-- ---------------------------------------------------------------------------
-- Families and consent (Phase 2 hooks: read-only for clients)
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.family_groups, public.family_members, public.parental_consents
from authenticated;

create policy "Members read their family" on public.family_groups
  for select to authenticated using (
    exists (
      select 1 from public.family_members m
      where m.group_id = id and m.profile_id = (select private.current_profile_id())
    )
  );
create policy "Members read their own membership" on public.family_members
  for select to authenticated using (
    profile_id = (select private.current_profile_id()) or (select private.is_guardian_of(profile_id))
  );
create policy "Parents and children read consent records" on public.parental_consents
  for select to authenticated using (
    parent_profile_id = (select private.current_profile_id())
    or child_profile_id = (select private.current_profile_id())
  );

-- ---------------------------------------------------------------------------
-- Entitlements: server-written
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.entitlements from authenticated;
create policy "Read own entitlement" on public.entitlements
  for select to authenticated using ((select private.can_manage(profile_id)));

-- ---------------------------------------------------------------------------
-- User-owned data: full CRUD on your own (and managed children's) rows
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['life_areas', 'goals', 'milestones', 'check_ins', 'reminders', 'reflections', 'user_achievements'] loop
    execute format($f$
      create policy "Owner reads" on public.%1$I
        for select to authenticated using ((select private.can_manage(profile_id)));
      create policy "Owner inserts" on public.%1$I
        for insert to authenticated with check ((select private.can_manage(profile_id)));
      create policy "Owner updates" on public.%1$I
        for update to authenticated
        using ((select private.can_manage(profile_id)))
        with check ((select private.can_manage(profile_id)));
      create policy "Owner deletes" on public.%1$I
        for delete to authenticated using ((select private.can_manage(profile_id)));
    $f$, t);
  end loop;
end;
$$;

-- Buddies: read-only access to shared goals and their progress.
create policy "Buddies read shared goals" on public.goals
  for select to authenticated using ((select private.is_buddy_of_goal(id)));
create policy "Buddies read shared milestones" on public.milestones
  for select to authenticated using ((select private.is_buddy_of_goal(goal_id)));
create policy "Buddies read shared check-ins" on public.check_ins
  for select to authenticated using ((select private.is_buddy_of_goal(goal_id)));

-- ---------------------------------------------------------------------------
-- Shares and reactions (Phase 2 hooks)
-- ---------------------------------------------------------------------------

create policy "Owner and buddy read shares" on public.shares
  for select to authenticated using (
    (select private.can_manage(owner_profile_id))
    or buddy_profile_id = (select private.current_profile_id())
  );
create policy "Owner creates shares" on public.shares
  for insert to authenticated with check ((select private.can_manage(owner_profile_id)));
create policy "Owner updates shares" on public.shares
  for update to authenticated
  using ((select private.can_manage(owner_profile_id)))
  with check ((select private.can_manage(owner_profile_id)));
create policy "Owner deletes shares" on public.shares
  for delete to authenticated using ((select private.can_manage(owner_profile_id)));

revoke update on public.reactions from authenticated;
create policy "Sender and goal owner read reactions" on public.reactions
  for select to authenticated using (
    from_profile_id = (select private.current_profile_id())
    or exists (
      select 1 from public.shares s
      where s.id = share_id and (select private.can_manage(s.owner_profile_id))
    )
  );
create policy "Buddies react to accepted shares" on public.reactions
  for insert to authenticated with check (
    from_profile_id = (select private.current_profile_id())
    and exists (
      select 1 from public.shares s
      where s.id = share_id
        and s.buddy_profile_id = (select private.current_profile_id())
        and s.accepted_at is not null
        and s.revoked_at is null
        and s.can_cheer
    )
  );
create policy "Sender deletes own reactions" on public.reactions
  for delete to authenticated using (from_profile_id = (select private.current_profile_id()));
