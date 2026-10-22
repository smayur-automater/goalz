# Architecture & product decisions

Each entry records what was decided, why, and what it costs. Newest last.

## ADR-001: Logged-in app built once with Expo Router (iOS, Android, web); Next.js for marketing only
- **Why:** one set of screens means feature parity by construction, and every Definition-of-Done check runs once, not twice. The logged-in app needs no SEO.
- **Trade-off:** web needs extra polish (keyboard focus, hover, wide layouts). Milestone 4 becomes "web polish + responsive".
- **Status:** proposed, not yet confirmed by the owner. Revisit before Milestone 3 if the owner wants a full Next.js app.

## ADR-002: Charts are custom `react-native-svg` components
- **Why:** the app needs only a ring, bars, a 30-day consistency strip, a history chart and a radar wheel. One implementation works on all platforms, and each chart gets a text summary for screen readers.

## ADR-003: Age modes at launch are Standard, Teen, Senior (Simple) and Working
- **Kids mode is removed from scope** (owner decision, 2026-10-22). This avoids COPPA verifiable parental consent, Apple Kids Category and Google Families Policy obligations for now.
- The schema keeps hooks (`family_group_id`, `is_managed`, `parental_consents`) so Kids can return later without a migration rewrite.
- **Working** (working population): a preset for busy adults. It has the Standard feature set, but defaults to Career / Financial / Investments / Health, uses denser one-tap logging, weekday-aware reminders, and short insights. *Owner to confirm this interpretation.*
- Teen: limited, safe sharing (off by default in AU), with no finance/investment tracking by default.
- Modes are a presentation layer (`ModeProvider`); the data model is identical.

## ADR-004: Australia first; Supabase region Sydney (ap-southeast-2)
- Launch market is Australia, then the rest of the world.
- Primary compliance baseline: Australian Privacy Principles; GDPR and UK rules applied by design for later expansion.
- Default locale `en-AU`, metric units, AUD, Monday week start. All of these stay configurable per user.
- **Data residency:** a single Sydney region. EU expansion may later need an EU project. Flagged as a future cost.

## ADR-005: Local notifications for reminders in the MVP
- Expo schedules reminders on the device (works offline, honours quiet hours, no server). The `reminders` table is the source of truth, so a new device can rebuild its schedule. Server push arrives with Phase 2 buddies.

## ADR-006: Offline-ready data shape
- Ids are generated on the device (UUIDv7), rows carry `updated_at` and `deleted_at`, and check-ins can be retried without duplicating. Check-ins store `local_date` so a habit "day" is the user's local day across travel and DST.
