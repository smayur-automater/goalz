# Goalz

*Set it. Track it. Grow it. Every part of your life, in one simple place.*

A goal-setting and life-progress app for iOS, Android and web. Launching in Australia first.

## Status

Repo scaffold only. Milestone 1 (Foundation) is next. See [DECISIONS.md](./DECISIONS.md).

## Layout

```
apps/        app (Expo Router: iOS, Android, web)   site (Next.js marketing)
packages/    tokens  ui  core  schemas  i18n  api  config
supabase/    migrations  functions  tests (pgTAP RLS tests)
e2e/         Playwright (web) and Maestro (mobile) flows
```

## Setup

Requirements: Node 22+, pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # fill in values; never commit .env files
```

More steps (Supabase local stack, running the app) will be added as each milestone lands.
