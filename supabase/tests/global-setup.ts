import type { TestProject } from 'vitest/node';
// @ts-expect-error plain ESM script without type declarations
import { resetTestDb } from '../scripts/reset-test-db.mjs';

declare module 'vitest' {
  export interface ProvidedContext {
    dbAvailable: boolean;
  }
}

export default async function setup(project: TestProject) {
  try {
    await resetTestDb();
    project.provide('dbAvailable', true);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // A migration error is always a failure. A missing database is only fatal in CI.
    if (message.startsWith('Migration') || process.env.CI) throw e;
    console.warn(
      `\n⚠ Skipping database tests: no Postgres at TEST_DATABASE_URL (${message}).\n` +
        '  Start Postgres locally, or run them in CI.\n',
    );
    project.provide('dbAvailable', false);
  }
}
