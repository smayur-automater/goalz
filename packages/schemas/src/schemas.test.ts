import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkInInputSchema,
  goalInputSchema,
  LIMITS,
  profileUpdateSchema,
  reminderInputSchema,
} from './index';

const area = '0190e1d4-6a1b-7c3e-9d2f-1a2b3c4d5e6f';

describe('goalInputSchema', () => {
  it('accepts a target goal and applies defaults', () => {
    const goal = goalInputSchema.parse({
      type: 'target',
      area_id: area,
      title: '  Build an emergency fund ',
      target_value: 10000,
      quantity: 'currency',
      why: '',
    });
    expect(goal).toMatchObject({
      title: 'Build an emergency fund',
      why: null,
      start_value: 0,
      privacy: 'private',
    });
  });

  it('requires a target value for target goals and a frequency for habits', () => {
    expect(
      goalInputSchema.safeParse({ type: 'target', area_id: area, title: 'Save' }).success,
    ).toBe(false);
    expect(goalInputSchema.safeParse({ type: 'habit', area_id: area, title: 'Walk' }).success).toBe(
      false,
    );
  });

  it('rejects invalid habit frequencies', () => {
    for (const frequency of [
      { period: 'fortnight', times: 1 },
      { period: 'week', times: 0 },
      { period: 'week', times: 3, days: [7] },
    ]) {
      expect(
        goalInputSchema.safeParse({ type: 'habit', area_id: area, title: 'Gym', frequency })
          .success,
      ).toBe(false);
    }
  });

  it('rejects a target date before the start date', () => {
    const r = goalInputSchema.safeParse({
      type: 'yesno',
      area_id: area,
      title: 'Trip',
      start_date: '2026-05-01',
      target_date: '2026-04-01',
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['target_date']);
  });

  it('rejects blank and overlong titles', () => {
    expect(goalInputSchema.safeParse({ type: 'yesno', area_id: area, title: '   ' }).success).toBe(
      false,
    );
    expect(
      goalInputSchema.safeParse({
        type: 'yesno',
        area_id: area,
        title: 'x'.repeat(LIMITS.title + 1),
      }).success,
    ).toBe(false);
  });
});

describe('checkInInputSchema', () => {
  it('needs a client id and a local date', () => {
    const ok = checkInInputSchema.safeParse({
      id: '0190e1d4-6a1b-7c3e-9d2f-1a2b3c4d5e70',
      goal_id: area,
      occurred_at: '2026-11-01T07:30:00+11:00',
      local_date: '2026-11-01',
    });
    expect(ok.success).toBe(true);
    expect(checkInInputSchema.safeParse({ goal_id: area, local_date: '2026-11-01' }).success).toBe(
      false,
    );
  });
});

describe('reminderInputSchema', () => {
  it('accepts HH:MM times only', () => {
    expect(reminderInputSchema.safeParse({ goal_id: area, times: ['07:30'] }).success).toBe(true);
    expect(reminderInputSchema.safeParse({ goal_id: area, times: ['7:30pm'] }).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  it('allows partial updates and rejects unknown modes', () => {
    expect(profileUpdateSchema.safeParse({ theme: 'dark' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ age_mode: 'kids' }).success).toBe(false);
  });
});

describe('limits match the database', () => {
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20261101000200_tables.sql', import.meta.url),
    'utf8',
  );
  it.each([
    ['title', `char_length(btrim(title)) between 1 and ${LIMITS.title}`],
    ['why', `char_length(why) <= ${LIMITS.why}`],
    ['notes', `char_length(notes) <= ${LIMITS.notes}`],
    ['unit', `char_length(unit) <= ${LIMITS.unit}`],
    ['check-in note', `char_length(note) <= ${LIMITS.checkInNote}`],
    ['reflection', `char_length(went_well) <= ${LIMITS.reflection}`],
    ['display name', `between 1 and ${LIMITS.displayName}`],
    ['reminders', `cardinality(times) between 1 and ${LIMITS.remindersPerGoal}`],
  ])('%s', (_name, fragment) => {
    expect(sql).toContain(fragment);
  });
});
