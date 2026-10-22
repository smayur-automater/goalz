import { describe, expect, it } from 'vitest';
import {
  convertToMetric,
  createI18n,
  formatCurrency,
  formatDate,
  formatMeasurement,
  formatPercent,
  getDirection,
  regionDefaults,
} from './index';
import { pseudoLocalise } from './pseudo';

describe('createI18n', () => {
  it('defaults to Australian English', () => {
    const i18n = createI18n();
    expect(i18n.language).toBe('en-AU');
    expect(i18n.t('app.tagline')).toBe('Set it. Track it. Grow it.');
  });

  it('interpolates values', () => {
    expect(createI18n().t('progress.percent', { value: 40 })).toBe('40% complete');
  });

  it('picks a mode-specific variant through context, falling back to the base string', () => {
    const { t } = createI18n();
    // Screens pass the current AgeMode, which is a runtime string.
    const mode = (m: string) => m;
    expect(t('encourage.pickUp', { context: mode('simple') })).toBe(
      "Welcome back. Let's carry on.",
    );
    expect(t('encourage.pickUp', { context: mode('teen') })).toBe(
      'Welcome back. Pick up where you left off.',
    );
  });

  it('serves pseudo locales only when asked', () => {
    const pseudo = createI18n({ locale: 'en-XA', includePseudo: true });
    expect(pseudo.t('action.save')).toMatch(/^\[Sávé ~+\]$/);
    const plain = createI18n({ locale: 'en-XA' });
    expect(plain.t('action.save')).toBe('Save');
  });
});

describe('pseudoLocalise', () => {
  it('keeps placeholders untouched', () => {
    const out = pseudoLocalise({ a: '{{current}} of {{target}}' });
    expect(out.a).toContain('{{current}}');
    expect(out.a).toContain('{{target}}');
  });
});

describe('getDirection', () => {
  it.each([
    ['ar', 'rtl'],
    ['ar-SA', 'rtl'],
    ['he-IL', 'rtl'],
    ['fa', 'rtl'],
    ['ar-XB', 'rtl'],
    ['en-AU', 'ltr'],
    ['hi-IN', 'ltr'],
    ['zh-Hans-CN', 'ltr'],
  ])('%s is %s', (locale, dir) => {
    expect(getDirection(locale)).toBe(dir);
  });
});

describe('formatting', () => {
  it('formats AUD for Australia', () => {
    expect(formatCurrency('en-AU', 10000, 'AUD')).toBe('$10,000.00');
  });

  it('formats percentages from fractions', () => {
    expect(formatPercent('en-AU', 0.756)).toBe('76%');
  });

  it('formats calendar dates without shifting the day across time zones', () => {
    expect(formatDate('en-AU', '2026-10-22', 'long')).toBe('22 October 2026');
    expect(formatDate('en-US', '2026-01-01', 'short')).toBe('1/1/26');
  });

  it('converts and formats distances', () => {
    expect(formatMeasurement('en-AU', 'distance', 5, 'metric')).toBe('5 km');
    expect(formatMeasurement('en-US', 'distance', 5, 'imperial')).toBe('3.1 mi');
    expect(convertToMetric('weight', 2.20462, 'imperial')).toBeCloseTo(1);
  });

  it('has Australian defaults and a safe fallback', () => {
    expect(regionDefaults('au')).toEqual({ currency: 'AUD', units: 'metric', weekStart: 1 });
    expect(regionDefaults('ZZ').units).toBe('metric');
    expect(regionDefaults(undefined).currency).toBe('USD');
  });
});
