import { z } from 'zod';

/**
 * Client-side validation that mirrors the database constraints in
 * supabase/migrations. The database is still the final authority; these give
 * users instant, friendly feedback. Keep both in step (tests guard the limits).
 */
export const LIMITS = {
  title: 120,
  why: 500,
  notes: 2000,
  unit: 24,
  checkInNote: 1000,
  reflection: 2000,
  displayName: 50,
  areaName: 40,
  milestoneTitle: 120,
  maxAbsValue: 1e12,
  remindersPerGoal: 6,
} as const;

export const AGE_MODES = ['standard', 'teen', 'working', 'simple'] as const;
export const GOAL_TYPES = ['target', 'habit', 'milestone', 'yesno'] as const;
export const GOAL_QUANTITIES = [
  'count',
  'distance',
  'weight',
  'volume',
  'currency',
  'duration',
  'none',
] as const;

const isoDate = z.iso.date();
const amount = z
  .number()
  .finite()
  .refine((n) => Math.abs(n) < LIMITS.maxAbsValue, 'too_large');
const requiredText = (max: number) => z.string().trim().min(1, 'required').max(max, 'too_long');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'too_long')
    .transform((s) => (s === '' ? null : s))
    .nullish();

export const frequencySchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  times: z.number().int().min(1).max(31),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
});
export type Frequency = z.infer<typeof frequencySchema>;

const goalBase = z.object({
  id: z.uuid().optional(),
  area_id: z.uuid(),
  title: requiredText(LIMITS.title),
  why: optionalText(LIMITS.why),
  notes: optionalText(LIMITS.notes),
  quantity: z.enum(GOAL_QUANTITIES).default('count'),
  unit: optionalText(LIMITS.unit),
  start_value: amount.default(0),
  direction: z.enum(['increase', 'decrease']).default('increase'),
  start_date: isoDate.optional(),
  target_date: isoDate.nullish(),
  privacy: z.enum(['private', 'shared']).default('private'),
  template_id: z.string().max(64).nullish(),
});

export const goalInputSchema = z
  .discriminatedUnion('type', [
    goalBase.extend({ type: z.literal('target'), target_value: amount }),
    goalBase.extend({
      type: z.literal('habit'),
      frequency: frequencySchema,
      /** Optional amount per occurrence, e.g. 8 glasses. */
      target_value: amount.nullish(),
    }),
    goalBase.extend({ type: z.literal('milestone') }),
    goalBase.extend({ type: z.literal('yesno') }),
  ])
  .refine((g) => !g.target_date || !g.start_date || g.target_date >= g.start_date, {
    message: 'target_before_start',
    path: ['target_date'],
  });
export type GoalInput = z.input<typeof goalInputSchema>;
export type Goal = z.output<typeof goalInputSchema>;

export const checkInInputSchema = z.object({
  /** Generate on the device (UUIDv7) so a retried save never duplicates. */
  id: z.uuid(),
  goal_id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  /** The user's local calendar day, e.g. "2026-11-01". */
  local_date: isoDate,
  value: amount.default(1),
  note: optionalText(LIMITS.checkInNote),
  media_path: z.string().max(300).nullish(),
  source: z.enum(['manual', 'backfill', 'import']).default('manual'),
});
export type CheckInInput = z.input<typeof checkInInputSchema>;

export const milestoneInputSchema = z.object({
  id: z.uuid().optional(),
  goal_id: z.uuid(),
  position: z.number().int().min(0),
  title: requiredText(LIMITS.milestoneTitle),
});

export const reminderInputSchema = z.object({
  goal_id: z.uuid(),
  times: z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalid_time'))
    .min(1)
    .max(LIMITS.remindersPerGoal),
  days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  enabled: z.boolean().default(true),
});

export const reflectionInputSchema = z.object({
  week_start: isoDate,
  went_well: optionalText(LIMITS.reflection),
  adjust: optionalText(LIMITS.reflection),
  mood: z.number().int().min(1).max(5).nullish(),
});

export const profileUpdateSchema = z
  .object({
    display_name: requiredText(LIMITS.displayName),
    age_mode: z.enum(AGE_MODES),
    birth_year: z.number().int().min(1900).max(new Date().getFullYear()).nullable(),
    locale: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
    timezone: z.string().min(1).max(64),
    region: z.string().regex(/^[A-Z]{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    units: z.enum(['metric', 'imperial']),
    week_start: z.union([z.literal(0), z.literal(1), z.literal(6)]),
    theme: z.enum(['light', 'dark', 'system']),
    text_scale: z.number().min(1).max(2),
    analytics_opt_in: z.boolean(),
  })
  .partial();
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const emailSchema = z.email().max(254);
