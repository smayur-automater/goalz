/** 4-point spacing scale, in density-independent pixels. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export type SpaceKey = keyof typeof space;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
}

/** Base type scale for Standard mode. Modes multiply sizes by `fontScale`; the OS text size scales on top. */
export const typeScale = {
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  h3: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  h2: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  h1: { fontSize: 34, lineHeight: 42, fontWeight: '700' },
  display: { fontSize: 44, lineHeight: 52, fontWeight: '700' },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const fontFamily = {
  /** Default UI face. */
  sans: 'Inter',
  /** Simple (Senior) mode: designed for low-vision legibility. */
  hyperlegible: 'Atkinson Hyperlegible',
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

/** CSS box-shadow strings; React Native 0.76+ and react-native-web both accept `boxShadow`. */
export const shadow = {
  none: 'none',
  sm: '0px 1px 2px rgba(16, 32, 30, 0.06), 0px 1px 3px rgba(16, 32, 30, 0.08)',
  md: '0px 4px 12px rgba(16, 32, 30, 0.08), 0px 2px 4px rgba(16, 32, 30, 0.06)',
  lg: '0px 12px 32px rgba(16, 32, 30, 0.12), 0px 4px 8px rgba(16, 32, 30, 0.06)',
} as const;

export type ShadowKey = keyof typeof shadow;

/** Durations in ms. Use 0 when the user has "reduce motion" on. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
  celebrate: 900,
} as const;
