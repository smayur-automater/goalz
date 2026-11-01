# Database

Postgres on Supabase (project `lrhbnduacmrfixzgzcgp`, Sydney). The schema lives in
[`supabase/migrations`](../supabase/migrations) and is tested in [`supabase/tests`](../supabase/tests).

## Tables

| Table                                                                  | What it holds                                                                                                                                                                | Who can read                                | Who can write                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `profiles`                                                             | Display name, age mode, birth **year** (never full date), locale, time zone, region, units, theme, text size, quiet hours, reflection day, analytics opt-in (off by default) | Owner (and a parent, for a managed child)   | Owner, settings columns only. Created by sign-up; deleted with the account. |
| `life_areas`                                                           | The user's copy of the 13 default areas plus custom ones: name, icon, colour, order, hidden                                                                                  | Owner                                       | Owner                                                                       |
| `goals`                                                                | Type (target / habit / milestone / yes-no), title, why, unit, target, frequency, dates, status, privacy                                                                      | Owner; a buddy, for a goal shared with them | Owner                                                                       |
| `milestones`                                                           | Ordered steps of a milestone goal                                                                                                                                            | Owner; buddy of a shared goal               | Owner                                                                       |
| `check_ins`                                                            | Each log: when, the user's **local day**, value, note, photo path                                                                                                            | Owner; buddy of a shared goal               | Owner                                                                       |
| `reminders`                                                            | Times and weekdays per goal                                                                                                                                                  | Owner                                       | Owner                                                                       |
| `reflections`                                                          | Weekly "what went well / what to adjust", mood                                                                                                                               | Owner                                       | Owner                                                                       |
| `user_achievements`                                                    | Badges earned                                                                                                                                                                | Owner                                       | Owner                                                                       |
| `entitlements`                                                         | Free / premium                                                                                                                                                               | Owner                                       | Server only                                                                 |
| `life_area_defaults`, `goal_templates`, `achievements`, `region_rules` | Reference data                                                                                                                                                               | Everyone                                    | Nobody (migrations only)                                                    |
| `shares`, `reactions`                                                  | Phase 2: accountability buddies                                                                                                                                              | Owner and buddy                             | Owner shares; buddy cheers                                                  |
| `family_groups`, `family_members`, `parental_consents`                 | Phase 2 hooks for families / Kids                                                                                                                                            | Members                                     | Nobody yet                                                                  |

Storage: one private bucket, `user-media` (photos up to 10 MB). Files live under
`<profile_id>/…`, and only that profile can read or write them.

## How access is enforced

- **Row Level Security on every table**, checked by a test that fails if any table is added without it.
- **Composite foreign keys** (`goal_id, profile_id`): a check-in, milestone or reminder can
  never point at someone else's goal, even if an access rule had a bug.
- **Locked columns**: clients can't change `auth_user_id`, `is_managed`, family links,
  entitlements or goal approval.
- **Anonymous visitors** can read reference data and nothing else.
- **Validation in the database**: lengths, ranges, valid time zones, valid habit
  frequencies, no future check-ins, photo paths inside your own folder, and a rate limit of
  120 check-ins a minute.

## Account lifecycle

- **Sign-up** (magic link / 6-digit code, Apple, Google) creates the profile, the 13 life
  areas and a free entitlement, using the sign-up locale and time zone when valid.
- **Export**: `export_my_data()` returns everything the user owns. The app saves it as JSON
  plus one CSV per table. CSV cells are protected against spreadsheet formula injection.
- **Delete**: the `delete-account` Edge Function verifies the caller, deletes their photos,
  then deletes the auth user. Every row cascades away. Tested.

## Running the tests

Needs Postgres 15+ locally (no Docker required):

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/goalz_test pnpm --filter @goalz/supabase test
```

The tests act as each user exactly as Supabase does: the `authenticated` role with the
user's JWT claims. `supabase/tests/supabase-stub.sql` stands in for Supabase's `auth` and
`storage` schemas locally. It is never applied to the real project. Without a database the
tests skip locally, but always run in CI.

## Changing the schema

Add a new timestamped file to `supabase/migrations`. Never edit one that has been applied.
Reference data is generated: edit `tools/gen-reference-data.py`, run
`python3 tools/gen-reference-data.py .`, and the SQL and English strings update together.
