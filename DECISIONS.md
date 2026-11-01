# Architecture & product decisions

Each entry records what was decided, why, and what it costs. Newest last.

## ADR-001: Logged-in app built once with Expo Router (iOS, Android, web); Next.js for marketing only

- **Why:** one set of screens means feature parity by construction, and every Definition-of-Done check runs once, not twice. The logged-in app needs no SEO.
- **Trade-off:** web needs extra polish (keyboard focus, hover, wide layouts). Milestone 4 becomes "web polish + responsive".
- **Status:** adopted as the default (owner said "go" without objecting). Revisit before Milestone 3 if the owner wants a full Next.js app.

## ADR-002: Charts are custom `react-native-svg` components

- **Why:** the app needs only a ring, bars, a 30-day consistency strip, a history chart and a radar wheel. One implementation works on all platforms, and each chart gets a text summary for screen readers.

## ADR-003: Age modes at launch are Standard, Teen, Senior (Simple) and Working

- **Kids mode is removed from scope** (owner decision, 2026-10-22). This avoids COPPA verifiable parental consent, Apple Kids Category and Google Families Policy obligations for now.
- The schema keeps hooks (`family_group_id`, `is_managed`, `parental_consents`) so Kids can return later without a migration rewrite.
- **Working** (working population): a preset for busy adults. It has the Standard feature set, but defaults to Career / Financial / Investments / Health, uses denser one-tap logging, weekday-aware reminders, and short insights. _Owner to confirm this interpretation._
- Teen: limited, safe sharing (off by default in AU), with no finance/investment tracking by default.
- Modes are a presentation layer (`ModeProvider`); the data model is identical.

## ADR-004: Australia first; Supabase region Sydney (ap-southeast-2)

- Launch market is Australia, then the rest of the world.
- Primary compliance baseline: Australian Privacy Principles; GDPR and UK rules applied by design for later expansion.
- Default locale `en-AU`, metric units, AUD, Monday week start. All of these stay configurable per user.
- Supabase project `lrhbnduacmrfixzgzcgp` created by the owner in `ap-southeast-2` (confirmed 2026-10-22).
- **Data residency:** a single Sydney region. EU expansion may later need an EU project. Flagged as a future cost.

## ADR-005: Local notifications for reminders in the MVP

- Expo schedules reminders on the device (works offline, honours quiet hours, no server). The `reminders` table is the source of truth, so a new device can rebuild its schedule. Server push arrives with Phase 2 buddies.

## ADR-006: Offline-ready data shape

- Ids are generated on the device (UUIDv7), rows carry `updated_at` and `deleted_at`, and check-ins can be retried without duplicating. Check-ins store `local_date` so a habit "day" is the user's local day across travel and DST.

## ADR-007: UI kit is styled from theme objects; NativeWind is for app screens

- Kit components read `useTheme()` and build React Native style objects. Age mode changes sizes at runtime (Simple mode: 56pt targets, 20px body), which is simpler and safer as typed values than as class-name variants.
- NativeWind/Tailwind still gets the same tokens through `@goalz/tokens/tailwind` (CSS variables), for layout in app and marketing screens.
- **Trade-off:** two ways to style. The rule: reusable components use the theme; one-off screen layout may use classes.

## ADR-008: How the UI kit is tested

- **Unit / interaction:** Vitest + Testing Library against react-native-web in jsdom. This checks roles, names, states and keyboard behaviour, and runs axe on every component in all 4 modes × light/dark and in RTL.
- **Colour contrast:** checked in two places. Token tests calculate WCAG ratios for every pairing (jsdom can't). `pnpm --filter @goalz/ui a11y` runs axe, contrast included, on every Storybook story in real Chromium (4 modes × 2 schemes + long-text and RTL pseudo locales).
- **Native-only behaviour** (VoiceOver/TalkBack, haptics): React Native Testing Library and Maestro in the app from Milestone 3, plus manual screen-reader passes.
- Tests run with "reduce motion" on so the final state renders immediately.

## ADR-009: Dependency audit exception

- `GHSA-vfj7-8cjw-p6xm` (braces) comes in only through Metro, React Native's development bundler, and has no patched release. It isn't in the shipped app. It's ignored in `pnpm-workspace.yaml`; re-check monthly and remove the ignore once Expo/Metro ships a fix.

## ADR-010: User-facing strings are enforced by a local lint rule

- `goalz/no-literal-ui-string` (in `tools/eslint-plugin-goalz.mjs`) flags literal text in JSX and in props such as `label`, `title`, `placeholder` and `accessibilityLabel`. `eslint-plugin-i18next` was tried first, but it reports nothing under ESLint 10.
- Stories and tests are exempt.

## ADR-011: CI security scanning on a private repo

- Gitleaks runs as the free CLI container (the GitHub Action needs a paid licence for organisations).
- CodeQL and Dependency Review need GitHub Advanced Security on private repos, which is a **paid add-on**. They are skipped automatically while the repo is private. `pnpm audit` and Dependabot run regardless.
- Actions are pinned to major versions for now; pin to commit SHAs in Milestone 8 (hardening).

## ADR-012: Database access model

- Every user-owned row carries `profile_id`. Child rows (check-ins, milestones, reminders) use composite foreign keys `(goal_id, profile_id)`, so data can't cross accounts even if an access rule were wrong.
- Access-rule helpers are `SECURITY DEFINER` functions in an unexposed `private` schema, with `search_path` pinned. Tests fail if any table lacks RLS or a policy, or if a private function is callable anonymously.
- Profiles are created only by the sign-up trigger. Clients may update settings columns only (column-level grants).
- Each user gets their own copy of the 13 default life areas at sign-up, so renaming, hiding and reordering are plain updates.
- Reference data is applied by a migration (not only a seed), so production has it. It is generated with the English strings from `tools/gen-reference-data.py`.
- Region consent ages in `region_rules` are a starting point and **need legal review** per market.

## ADR-013: Database tests run on plain Postgres

- No Docker here, so `supabase start` isn't available. Tests run against plain Postgres with a small stand-in for Supabase's `auth` and `storage` schemas (`supabase/tests/supabase-stub.sql`), using the real `anon` / `authenticated` roles and JWT claims.
- CI uses a `postgres:17` service, the same major version as the Supabase project.
- **Trade-off:** the stand-in could differ from real Supabase in edge cases. After the migrations are applied, Supabase's security advisors are run against the real project as a second check.

## ADR-014: Sign-in

- Email magic link that also contains a 6-digit code (codes work when a link opens the wrong browser, and are easier for some users), plus Sign in with Apple and Google. No passwords. PKCE flow.
- **Owner to-do before launch:**
  - Custom SMTP, because Supabase's built-in email is heavily rate-limited (a cost, e.g. Resend or Postmark).
  - Apple Services ID and key.
  - Google OAuth client IDs.
  - Production redirect URLs.
