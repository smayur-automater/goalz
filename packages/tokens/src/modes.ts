import type { FontFamilyKey } from './scale';

/** Presentation modes. The data model is identical across all of them (see DECISIONS.md ADR-003). */
export const AGE_MODES = ['standard', 'teen', 'working', 'simple'] as const;
export type AgeMode = (typeof AGE_MODES)[number];

export interface ModeConfig {
  /** Multiplier applied to the base type scale, before the OS text-size setting. */
  fontScale: number;
  /** Smallest font size any text may render at, in points. */
  minFontSize: number;
  fontFamily: FontFamilyKey;
  /** Minimum width and height of any tappable target, in points. */
  minTouchTarget: number;
  /** Multiplier for padding and gaps. */
  density: number;
  /** Maximum number of bottom tabs / primary nav items. */
  maxNavItems: number;
  /** Always show a text label next to icons. */
  iconLabels: boolean;
  /** Use the high-contrast colour set. */
  highContrast: boolean;
}

export const modes: Record<AgeMode, ModeConfig> = {
  standard: {
    fontScale: 1,
    minFontSize: 13,
    fontFamily: 'sans',
    minTouchTarget: 44,
    density: 1,
    maxNavItems: 5,
    iconLabels: false,
    highContrast: false,
  },
  teen: {
    fontScale: 1,
    minFontSize: 13,
    fontFamily: 'sans',
    minTouchTarget: 44,
    density: 1,
    maxNavItems: 5,
    iconLabels: false,
    highContrast: false,
  },
  working: {
    fontScale: 1,
    minFontSize: 13,
    fontFamily: 'sans',
    minTouchTarget: 44,
    // Busy users: tighter spacing so more fits on one screen. Touch targets stay at 44.
    density: 0.85,
    maxNavItems: 5,
    iconLabels: false,
    highContrast: false,
  },
  simple: {
    // Body text 16 * 1.25 = 20px minimum, per the brief.
    fontScale: 1.25,
    minFontSize: 18,
    fontFamily: 'hyperlegible',
    minTouchTarget: 56,
    density: 1.25,
    maxNavItems: 3,
    iconLabels: true,
    highContrast: true,
  },
};
