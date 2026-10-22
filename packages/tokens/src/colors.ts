/**
 * Semantic colour roles. Components use these names, never raw hex values.
 * Every text/background pairing is checked for WCAG AA in colors.test.ts.
 */
export interface ColorRoles {
  /** App background behind cards. */
  bg: string;
  /** Cards, sheets, inputs. */
  surface: string;
  /** Subtle fills: chip backgrounds, progress tracks, pressed states. */
  surfaceAlt: string;
  text: string;
  textMuted: string;
  /** Decorative dividers only. Never the sole boundary of a control. */
  border: string;
  /** Boundaries of interactive controls (inputs, unselected chips). Must be 3:1 against surface. */
  borderStrong: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  success: string;
  warning: string;
  danger: string;
  onDanger: string;
  focus: string;
  /** Modal backdrop. */
  scrim: string;
}

export const light: ColorRoles = {
  bg: '#F6F8F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF2F1',
  text: '#13201E',
  textMuted: '#4A5B58',
  border: '#DCE4E2',
  borderStrong: '#6F817E',
  primary: '#0F766E',
  onPrimary: '#FFFFFF',
  primarySoft: '#D5F5EF',
  onPrimarySoft: '#134E4A',
  success: '#15803D',
  warning: '#A64B06',
  danger: '#B91C1C',
  onDanger: '#FFFFFF',
  focus: '#1D4ED8',
  scrim: 'rgba(10, 20, 19, 0.5)',
};

export const dark: ColorRoles = {
  bg: '#0A1312',
  surface: '#121F1E',
  surfaceAlt: '#1B2C2A',
  text: '#EAF2F1',
  textMuted: '#A6B8B5',
  border: '#283B39',
  borderStrong: '#6E8784',
  primary: '#2DD4BF',
  onPrimary: '#04201E',
  primarySoft: '#123F3B',
  onPrimarySoft: '#C8F7EF',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  onDanger: '#1F0505',
  focus: '#93C5FD',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** High-contrast variants used by Simple (Senior) mode or the OS "increase contrast" setting. Text targets AAA (7:1). */
export const lightHighContrast: ColorRoles = {
  ...light,
  bg: '#FFFFFF',
  surfaceAlt: '#E6ECEB',
  text: '#000000',
  textMuted: '#25302E',
  border: '#6F817E',
  borderStrong: '#25302E',
  primary: '#0B5953',
  onPrimarySoft: '#06302D',
  focus: '#1E3A8A',
};

export const darkHighContrast: ColorRoles = {
  ...dark,
  bg: '#000000',
  surface: '#0B1413',
  text: '#FFFFFF',
  textMuted: '#D3DFDD',
  border: '#6E8784',
  borderStrong: '#C2D0CE',
  primary: '#5EEAD4',
  onPrimarySoft: '#E6FBF7',
};
