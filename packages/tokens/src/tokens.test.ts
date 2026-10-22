import { describe, expect, it } from 'vitest';
import { LIFE_AREA_KEYS, areaColors } from './areas';
import { dark, darkHighContrast, light, lightHighContrast, type ColorRoles } from './colors';
import { AAA_TEXT, AA_NON_TEXT, AA_TEXT, contrastRatio } from './contrast';
import { AGE_MODES, modes } from './modes';
import { createTheme } from './theme';
import { cssStylesheet } from './css';

type Role = keyof ColorRoles;
const schemes = { light, dark, lightHighContrast, darkHighContrast };

/** [foreground, background, minimum ratio] */
const pairs: [Role, Role, number][] = [
  ['text', 'bg', AA_TEXT],
  ['text', 'surface', AA_TEXT],
  ['text', 'surfaceAlt', AA_TEXT],
  ['textMuted', 'bg', AA_TEXT],
  ['textMuted', 'surface', AA_TEXT],
  ['textMuted', 'surfaceAlt', AA_TEXT],
  ['primary', 'surface', AA_TEXT],
  ['primary', 'bg', AA_TEXT],
  ['onPrimary', 'primary', AA_TEXT],
  ['onPrimarySoft', 'primarySoft', AA_TEXT],
  ['danger', 'surface', AA_TEXT],
  ['onDanger', 'danger', AA_TEXT],
  ['success', 'surface', AA_TEXT],
  ['warning', 'surface', AA_TEXT],
  ['borderStrong', 'surface', AA_NON_TEXT],
  ['borderStrong', 'bg', AA_NON_TEXT],
  ['focus', 'surface', AA_NON_TEXT],
  ['focus', 'bg', AA_NON_TEXT],
  ['primary', 'surfaceAlt', AA_NON_TEXT],
];

describe.each(Object.entries(schemes))('%s colours', (_name, colors) => {
  it.each(pairs)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe('high-contrast colours', () => {
  it.each([lightHighContrast, darkHighContrast])('body text meets AAA', (colors) => {
    for (const bg of ['bg', 'surface'] as const) {
      expect(contrastRatio(colors.text, colors[bg])).toBeGreaterThanOrEqual(AAA_TEXT);
      expect(contrastRatio(colors.textMuted, colors[bg])).toBeGreaterThanOrEqual(AAA_TEXT);
    }
  });
});

describe('life area colours', () => {
  const cases = [
    ['light', light],
    ['dark', dark],
    ['light', lightHighContrast],
    ['dark', darkHighContrast],
  ] as const;
  it.each(cases)('%s: every area is readable on its tint and on cards', (scheme, colors) => {
    for (const key of LIFE_AREA_KEYS) {
      const { fg, bg } = areaColors[scheme][key];
      expect(contrastRatio(fg, bg), `${key} fg on bg`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(fg, colors.surface), `${key} fg on surface`).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
      expect(contrastRatio(fg, colors.surfaceAlt), `${key} fill on track`).toBeGreaterThanOrEqual(
        AA_NON_TEXT,
      );
    }
  });

  it('has a distinct colour per area', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const fgs = LIFE_AREA_KEYS.map((k) => areaColors[scheme][k].fg);
      expect(new Set(fgs).size).toBe(fgs.length);
    }
  });
});

describe('age modes', () => {
  it.each(AGE_MODES)('%s keeps touch targets at least 44pt', (mode) => {
    expect(modes[mode].minTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it('simple mode meets the senior requirements', () => {
    const theme = createTheme({ scheme: 'light', mode: 'simple' });
    expect(theme.type.body.fontSize).toBeGreaterThanOrEqual(20);
    expect(theme.modeConfig.minTouchTarget).toBeGreaterThanOrEqual(56);
    expect(theme.modeConfig.maxNavItems).toBeLessThanOrEqual(3);
    expect(theme.modeConfig.iconLabels).toBe(true);
    expect(theme.colors).toBe(lightHighContrast);
  });

  it('never renders text below the mode minimum', () => {
    for (const mode of AGE_MODES) {
      const theme = createTheme({ scheme: 'light', mode });
      for (const style of Object.values(theme.type)) {
        expect(style.fontSize).toBeGreaterThanOrEqual(modes[mode].minFontSize);
      }
    }
  });
});

describe('createTheme', () => {
  it('zeroes motion when reduce motion is on', () => {
    const theme = createTheme({ scheme: 'dark', mode: 'standard', reduceMotion: true });
    expect(Object.values(theme.motion).every((d) => d === 0)).toBe(true);
  });

  it('uses high contrast when the OS asks for it', () => {
    expect(createTheme({ scheme: 'dark', mode: 'teen', highContrast: true }).colors).toBe(
      darkHighContrast,
    );
  });
});

describe('cssStylesheet', () => {
  it('emits light, dark and override blocks', () => {
    const css = cssStylesheet();
    expect(css).toContain('--color-primary: #0F766E;');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('--area-career-bg');
  });
});
