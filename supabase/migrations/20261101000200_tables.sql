-- Core tables. Row Level Security is enabled in the next migration.
-- Conventions:
--   * Ids are uuids; clients may supply their own (UUIDv7) so retries are idempotent.
--   * User-owned rows carry profile_id. Child rows use composite foreign keys
--     (parent_id, profile_id) so they can never point at another user's data.
--   * Rows that can be undone carry deleted_at (soft delete) for offline sync.

-- ---------------------------------------------------------------------------
-- Reference data (read-only for clients)
-- ---------------------------------------------------------------------------

create table public.region_rules (
  region text primary key check (region ~ '^[A-Z]{2}$'),
  digital_consent_age smallint not null check (digital_consent_age between 13 and 18),
  teen_sharing_default boolean not null default false,
  analytics_allowed_default boolean not null default false
);
comment on table public.region_rules is 'Per-country rules: age thresholds and privacy defaults.';

create table public.life_area_defaults (
  key text primary key check (key ~ '^[a-z_]{2,32}$'),
  icon text not null,
  color_token text not null,
  sort_order smallint not null,
  -- Preselected during onboarding for these modes.
  suggested_for public.age_mode[] not null default '{}',
  -- Hidden by default for teens (e.g. investments). Teens can still turn it on.
  hidden_for_teen boolean not null default false
);
comment on table public.life_area_defaults is 'The built-in life areas. Display names come from i18n keys area.<key>.';

create table public.goal_templates (
  id text primary key check (id ~ '^[a-z0-9_.-]{2,64}$'),
  area_key text not null references public.life_area_defaults (key),
  type public.goal_type not null,
  -- i18n key prefix; the app reads <title_key>.title and <title_key>.why
  title_key text not null,
  defaults jsonb not null default '{}' check (jsonb_typeof(defaults) = 'object'),
  sort_order smallint not null default 0,
  suitable_for_teen boolean not null default true
);

create table public.achievements (
  key text primary key check (key ~ '^[a-z0-9_]{2,48}$'),
  tier smallint not null default 1 check (tier between 1 and 3),
  icon text not null,
  criteria jsonb not null default '{}' check (jsonb_typeof(criteria) = 'object'),
  sort_order smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

-- Phase 2 hook: families. No client writes yet.
create table public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  -- Null only for parent-managed profiles (Phase 2, Kids).
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  display_name text check (char_length(btrim(display_name)) between 1 and 50),
  avatar_path text check (char_length(avatar_path) <= 300),
  age_mode public.age_mode not null default 'standard',
  -- Birth year only, never a full date of birth (data minimisation).
  birth_year smallint check (birth_year between 1900 and 2100),
  locale text not null default 'en-AU' check (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  timezone text not null default 'Australia/Sydney',
  region text not null default 'AU' check (region ~ '^[A-Z]{2}$'),
  currency text not null default 'AUD' check (currency ~ '^[A-Z]{3}$'),
  units public.unit_system not null default 'metric',
  week_start smallint not null default 1 check (week_start in (0, 1, 6)),
  theme public.theme_pref not null default 'system',
  text_scale numeric(3, 2) not null default 1 check (text_scale between 1 and 2),
  quiet_start time not null default '21:00',
  quiet_end time not null default '07:00',
  reflection_day smallint not null default 0 check (reflection_day between 0 and 6),
  reflection_time time not null default '18:00',
  -- Privacy by default: product analytics only after an explicit opt-in.
  analytics_opt_in boolean not null default false,
  prefs jsonb not null default '{}' check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) < 8192),
  onboarded_at timestamptz,
  -- Phase 2 hooks (Kids / families).
  is_managed boolean not null default false,
  family_group_id uuid references public.family_groups (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_owner check (auth_user_id is not null or is_managed)
);

create table public.family_members (
  group_id uuid not null references public.family_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_role not null,
  permissions jsonb not null default '{}' check (jsonb_typeof(permissions) = 'object'),
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index family_members_profile_idx on public.family_members (profile_id);

-- Phase 2 hook: verifiable parental consent records.
create table public.parental_consents (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  parent_profile_id uuid not null references public.profiles (id) on delete cascade,
  method text not null check (char_length(method) <= 40),
  verified_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.entitlements (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  tier public.entitlement_tier not null default 'free',
  source text check (char_length(source) <= 40),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.entitlements is 'Written only by the server (e.g. RevenueCat webhook). Clients can read their own row.';

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------

create table public.life_areas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  default_key text references public.life_area_defaults (key),
  custom_name text check (char_length(btrim(custom_name)) between 1 and 40),
  icon text not null check (char_length(icon) <= 40),
  color_token text not null check (char_length(color_token) <= 40),
  sort_order integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint life_areas_named check (default_key is not null or custom_name is not null),
  unique (profile_id, default_key),
  unique (id, profile_id)
);
create index life_areas_profile_idx on public.life_areas (profile_id, sort_order);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  area_id uuid not null,
  template_id text references public.goal_templates (id) on delete set null,
  type public.goal_type not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  why text check (char_length(why) <= 500),
  notes text check (char_length(notes) <= 2000),
  quantity public.goal_quantity not null default 'count',
  unit text check (char_length(unit) <= 24),
  start_value numeric not null default 0 check (abs(start_value) < 1e12),
  target_value numeric check (abs(target_value) < 1e12),
  direction public.goal_direction not null default 'increase',
  frequency jsonb check (private.is_valid_frequency(frequency)),
  start_date date not null default current_date,
  target_date date,
  status public.goal_status not null default 'active',
  completed_at timestamptz,
  privacy public.goal_privacy not null default 'private',
  -- Phase 2 hook: parent approval of a child's goal.
  approval_status public.approval_status not null default 'not_required',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (area_id, profile_id) references public.life_areas (id, profile_id) on delete cascade,
  unique (id, profile_id),
  constraint goals_target_needs_value check (type <> 'target' or target_value is not null),
  constraint goals_habit_needs_frequency check (type <> 'habit' or frequency is not null),
  constraint goals_dates check (target_date is null or target_date >= start_date)
);
comment on column public.goals.target_value is
  'Target goals: the number to reach. Habit goals: optional amount per occurrence (e.g. 8 glasses).';
comment on column public.goals.frequency is
  'Habit goals only: {"period": "day"|"week"|"month", "times": n, "days": [0-6]}.';
create index goals_profile_idx on public.goals (profile_id, status) where deleted_at is null;
create index goals_area_idx on public.goals (area_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  profile_id uuid not null,
  position integer not null check (position >= 0),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (goal_id, profile_id) references public.goals (id, profile_id) on delete cascade
);
create index milestones_goal_idx on public.milestones (goal_id, position);
create index milestones_profile_idx on public.milestones (profile_id);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  profile_id uuid not null,
  occurred_at timestamptz not null default now(),
  -- The user's local calendar day when it happened. Habits count by this, so travel
  -- and daylight-saving changes never move a check-in to the wrong day.
  local_date date not null,
  value numeric not null default 1 check (abs(value) < 1e12),
  note text check (char_length(note) <= 1000),
  media_path text check (char_length(media_path) <= 300),
  source public.check_in_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (goal_id, profile_id) references public.goals (id, profile_id) on delete cascade
);
create index check_ins_goal_day_idx on public.check_ins (goal_id, local_date) where deleted_at is null;
create index check_ins_profile_day_idx on public.check_ins (profile_id, local_date) where deleted_at is null;
create index check_ins_profile_created_idx on public.check_ins (profile_id, created_at);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  profile_id uuid not null,
  times time[] not null check (cardinality(times) between 1 and 6),
  -- 0 = Sunday … 6 = Saturday. Empty means every day.
  days smallint[] not null default '{}' check (days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, profile_id) references public.goals (id, profile_id) on delete cascade
);
create index reminders_goal_idx on public.reminders (goal_id);
create index reminders_profile_idx on public.reminders (profile_id);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  went_well text check (char_length(went_well) <= 2000),
  adjust text check (char_length(adjust) <= 2000),
  mood smallint check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (profile_id, week_start)
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  achievement_key text not null references public.achievements (key),
  goal_id uuid,
  earned_at timestamptz not null default now(),
  foreign key (goal_id, profile_id) references public.goals (id, profile_id) on delete cascade,
  unique nulls not distinct (profile_id, achievement_key, goal_id)
);

-- ---------------------------------------------------------------------------
-- Phase 2 hooks: accountability buddies
-- ---------------------------------------------------------------------------

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  owner_profile_id uuid not null,
  buddy_profile_id uuid not null references public.profiles (id) on delete cascade,
  can_cheer boolean not null default true,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  foreign key (goal_id, owner_profile_id) references public.goals (id, profile_id) on delete cascade,
  constraint shares_not_self check (owner_profile_id <> buddy_profile_id),
  unique (goal_id, buddy_profile_id)
);
create index shares_buddy_idx on public.shares (buddy_profile_id) where revoked_at is null;

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares (id) on delete cascade,
  from_profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now()
);
create index reactions_share_idx on public.reactions (share_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'family_groups', 'profiles', 'entitlements', 'life_areas', 'goals',
    'milestones', 'check_ins', 'reminders', 'reflections'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;
