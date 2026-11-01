import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll } from 'vitest';
// @ts-expect-error plain ESM script without type declarations
import { TEST_DB_URL } from '../scripts/reset-test-db.mjs';

const pool = new pg.Pool({ connectionString: TEST_DB_URL as string, max: 4 });
afterAll(() => pool.end());

export type Query = <R extends pg.QueryResultRow = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<pg.QueryResult<R>>;

/** Runs SQL as the database owner (bypasses RLS). For test setup only. */
export const admin: Query = (sql, params) => pool.query(sql, params);

export interface TestUser {
  authId: string;
  profileId: string;
  email: string;
}

/** Signs up a user the way Supabase Auth does: by inserting into auth.users. */
export async function createUser(meta: Record<string, unknown> = {}): Promise<TestUser> {
  const email = `${randomUUID()}@example.test`;
  const { rows } = await admin<{ id: string }>(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id',
    [email, meta],
  );
  const authId = rows[0]!.id;
  const profile = await admin<{ id: string }>(
    'select id from public.profiles where auth_user_id = $1',
    [authId],
  );
  return { authId, profileId: profile.rows[0]!.id, email };
}

/**
 * Runs `fn` exactly as a Supabase API request would: as the `authenticated` role with
 * the user's JWT claims (or as `anon` when user is null). Everything is rolled back.
 */
export async function as<T>(user: TestUser | null, fn: (q: Query) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (user) {
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: user.authId, role: 'authenticated' }),
      ]);
    } else {
      await client.query('set local role anon');
    }
    const q: Query = (sql, params) => client.query(sql, params);
    return await fn(q);
  } finally {
    await client.query('rollback').catch(() => {});
    client.release();
  }
}

/** Resolves to the Postgres error code (e.g. '42501') or throws if the query succeeded. */
export async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    return (e as { code?: string }).code ?? 'unknown';
  }
  throw new Error('Expected the query to fail, but it succeeded.');
}

export const RLS_VIOLATION = '42501';
export const FK_VIOLATION = '23503';

/** A goal owned by `user`, created as that user, committed. */
export async function createGoal(
  user: TestUser,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; areaId: string }> {
  const area = await admin<{ id: string }>(
    "select id from public.life_areas where profile_id = $1 and default_key = 'fitness'",
    [user.profileId],
  );
  const areaId = area.rows[0]!.id;
  const values = {
    profile_id: user.profileId,
    area_id: areaId,
    type: 'habit',
    title: 'Walk every day',
    frequency: { period: 'day', times: 1 },
    ...overrides,
  };
  const cols = Object.keys(values);
  const { rows } = await admin<{ id: string }>(
    `insert into public.goals (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
    Object.values(values),
  );
  return { id: rows[0]!.id, areaId };
}

export async function createCheckIn(user: TestUser, goalId: string, value = 1) {
  const { rows } = await admin<{ id: string }>(
    `insert into public.check_ins (goal_id, profile_id, local_date, value)
     values ($1, $2, current_date, $3) returning id`,
    [goalId, user.profileId, value],
  );
  return rows[0]!.id;
}
