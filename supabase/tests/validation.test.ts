import { beforeAll, describe, expect, inject, it } from 'vitest';
import { admin, as, createGoal, createUser, errorCode, type TestUser } from './helpers';

describe.skipIf(!inject('dbAvailable'))('sign-up provisioning', () => {
  it('creates a profile, the 13 default life areas and a free entitlement', async () => {
    const user = await createUser({
      display_name: '  Sam  ',
      timezone: 'Australia/Perth',
      locale: 'en-AU',
    });
    const profile = await admin(
      'select display_name, timezone, locale, age_mode, analytics_opt_in from public.profiles where id = $1',
      [user.profileId],
    );
    expect(profile.rows[0]).toEqual({
      display_name: 'Sam',
      timezone: 'Australia/Perth',
      locale: 'en-AU',
      age_mode: 'standard',
      analytics_opt_in: false,
    });
    const areas = await admin('select 1 from public.life_areas where profile_id = $1', [
      user.profileId,
    ]);
    expect(areas.rowCount).toBe(13);
    const ent = await admin('select tier from public.entitlements where profile_id = $1', [
      user.profileId,
    ]);
    expect(ent.rows).toEqual([{ tier: 'free' }]);
  });

  it('falls back to Australian defaults when sign-up metadata is invalid', async () => {
    const user = await createUser({ timezone: 'Mars/Olympus', locale: 'English!!' });
    const { rows } = await admin(
      'select timezone, locale, display_name from public.profiles where id = $1',
      [user.profileId],
    );
    expect(rows[0]).toEqual({ timezone: 'Australia/Sydney', locale: 'en-AU', display_name: null });
  });
});

describe.skipIf(!inject('dbAvailable'))('validation', () => {
  let user: TestUser;
  let goalId: string;
  let areaId: string;

  beforeAll(async () => {
    user = await createUser();
    const goal = await createGoal(user);
    goalId = goal.id;
    areaId = goal.areaId;
  });

  const insertGoal = (cols: Record<string, unknown>) =>
    as(user, (q) => {
      const values = { profile_id: user.profileId, area_id: areaId, ...cols };
      const keys = Object.keys(values);
      return q(
        `insert into public.goals (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
        Object.values(values),
      );
    });

  it('requires a target value for target goals and a frequency for habits', async () => {
    expect(await errorCode(insertGoal({ type: 'target', title: 'Save' }))).toBe('23514');
    expect(await errorCode(insertGoal({ type: 'habit', title: 'Walk' }))).toBe('23514');
  });

  it.each([
    [{ period: 'fortnight', times: 1 }],
    [{ period: 'week', times: 0 }],
    [{ period: 'week', times: 3, days: [7] }],
    [{ period: 'week' }],
  ])('rejects malformed habit frequency %j', async (frequency) => {
    expect(await errorCode(insertGoal({ type: 'habit', title: 'Walk', frequency }))).toBe('23514');
  });

  it('accepts a valid weekday habit', async () => {
    await expect(
      insertGoal({
        type: 'habit',
        title: 'Gym',
        frequency: { period: 'week', times: 3, days: [1, 3, 5] },
      }),
    ).resolves.toBeDefined();
  });

  it('rejects blank or overlong titles and target dates before the start', async () => {
    expect(await errorCode(insertGoal({ type: 'yesno', title: '   ' }))).toBe('23514');
    expect(await errorCode(insertGoal({ type: 'yesno', title: 'x'.repeat(121) }))).toBe('23514');
    expect(
      await errorCode(
        insertGoal({
          type: 'yesno',
          title: 'Trip',
          start_date: '2026-05-01',
          target_date: '2026-04-01',
        }),
      ),
    ).toBe('23514');
  });

  it('rejects unknown time zones on profiles', async () => {
    expect(
      await errorCode(
        as(user, (q) =>
          q("update public.profiles set timezone = 'Nowhere/Land' where id = $1", [user.profileId]),
        ),
      ),
    ).toBe('22023');
  });

  it('rejects check-ins dated in the future, but allows backdating', async () => {
    const insert = (date: string) =>
      as(user, (q) =>
        q('insert into public.check_ins (goal_id, profile_id, local_date) values ($1, $2, $3)', [
          goalId,
          user.profileId,
          date,
        ]),
      );
    expect(await errorCode(insert('2999-01-01'))).toBe('22023');
    await expect(insert('2026-01-15')).resolves.toBeDefined();
  });

  it('rejects check-in media outside the owner’s folder', async () => {
    const other = await createUser();
    expect(
      await errorCode(
        as(user, (q) =>
          q(
            'insert into public.check_ins (goal_id, profile_id, local_date, media_path) values ($1, $2, current_date, $3)',
            [goalId, user.profileId, `${other.profileId}/x.jpg`],
          ),
        ),
      ),
    ).toBe('42501');
  });

  it('rate-limits a burst of check-ins', async () => {
    const code = await errorCode(
      as(user, async (q) => {
        for (let i = 0; i < 125; i++) {
          await q(
            'insert into public.check_ins (goal_id, profile_id, local_date) values ($1, $2, current_date)',
            [goalId, user.profileId],
          );
        }
      }),
    );
    expect(code).toBe('54000');
  });

  it('keeps birth year only, within a sane range', async () => {
    expect(
      await errorCode(
        as(user, (q) =>
          q('update public.profiles set birth_year = 1800 where id = $1', [user.profileId]),
        ),
      ),
    ).toBe('23514');
  });
});
