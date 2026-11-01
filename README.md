# Goalz

_Set it. Track it. Grow it. Every part of your life, in one simple place._

A goal-setting and life-progress app for iOS, Android and web. Launching in Australia first.

## Status

| Milestone                                                                 | State                                       |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| 1. Foundation: tooling, CI, tokens, UI kit, theming, i18n, Storybook      | Done                                        |
| 2. Backend: Supabase schema, RLS + tests, auth, seed data                 | Built; applying to Supabase awaits approval |
| 3–8. Core app, web polish, age modes, insights, marketing site, hardening | Planned                                     |

Architecture decisions and their trade-offs are in [DECISIONS.md](./DECISIONS.md).

## Layout

```
apps/                 (Milestone 3+) app: Expo Router for iOS, Android, web · site: Next.js marketing
packages/
  config/             Shared TypeScript config (strict)
  tokens/             Design tokens: colours, life areas, type, spacing, age modes, WCAG contrast helpers
  i18n/               i18next setup, en (AU) strings, pseudo locales, RTL detection, Intl formatting
  ui/                 Cross-platform component kit (React Native + react-native-web) and Storybook
  schemas/            Zod validation shared by forms and the server (mirrors database limits)
  api/                Supabase client, sign-in flows, data export (JSON/CSV), account deletion
supabase/             Migrations, Edge Functions, database tests (see docs/database.md)
docs/                 Database guide
tools/                Local ESLint rules
```

## Setup

Requirements: Node 22+ and pnpm 10 (`corepack enable` gives you the pinned pnpm).

```bash
pnpm install
cp .env.example .env.local   # fill in values; .env files are never committed
```

## Everyday commands

| Command                                                | What it does                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `pnpm check`                                           | Everything CI runs: format check, lint, typecheck, unit tests    |
| `pnpm test`                                            | Unit, component and database tests (Vitest)                      |
| `pnpm storybook`                                       | Component explorer at http://localhost:6006                      |
| `pnpm build-storybook && pnpm --filter @goalz/ui a11y` | axe audit, including colour contrast, of every story in Chromium |
| `pnpm format`                                          | Format with Prettier                                             |

Database tests need a local Postgres (see [docs/database.md](./docs/database.md)). Without one they're skipped locally; CI always runs them.

In Storybook, the toolbar switches **Theme** (light/dark), **Mode** (Standard, Teen, Working, Simple) and **Locale**. The pseudo locales show long translated text (`en-XA`) and right-to-left layout (`ar-XB`).

To run the a11y audit with an already-installed Chromium, set `CHROMIUM_PATH=/path/to/chrome`. Otherwise run `pnpm --filter @goalz/ui exec playwright install chromium` once.

## Conventions

- **Strings:** never hard-code user-facing text. Add it to `packages/i18n/src/locales/en/common.json` and use `t()`. Lint enforces this. Translation keys are type-checked.
- **Colours:** use semantic roles (`colors.primary`, `areas.fitness.fg`), never raw hex. New pairings need a contrast test in `packages/tokens`.
- **Layout direction:** use `paddingStart`/`marginEnd`, not left/right, so layouts flip in RTL. Pass `mirrorInRTL` to directional icons.
- **Accessibility:** every control needs an accessible name, and never signal state with colour alone. Touch targets come from `modeConfig.minTouchTarget`.
- **Commits:** small and focused, with a conventional prefix (`feat(ui):`, `fix(tokens):`, `chore:`).
