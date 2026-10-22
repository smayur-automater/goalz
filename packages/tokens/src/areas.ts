/**
 * Default life areas. Each has a distinct hue plus an icon, so colour is never the only signal.
 * `fg` is used for icons, text and progress fills; `bg` is the soft tint behind them.
 */
export const LIFE_AREA_KEYS = [
  'career',
  'financial',
  'investments',
  'health',
  'fitness',
  'education',
  'academics',
  'hobbies',
  'social',
  'logic',
  'analytics',
  'mindfulness',
  'family',
] as const;

export type LifeAreaKey = (typeof LIFE_AREA_KEYS)[number];

export interface AreaColor {
  fg: string;
  bg: string;
}

export const areaColors: Record<'light' | 'dark', Record<LifeAreaKey, AreaColor>> = {
  light: {
    career: { fg: '#4338CA', bg: '#EEF0FF' },
    financial: { fg: '#047857', bg: '#E8FAF2' },
    investments: { fg: '#4D7C0F', bg: '#F3FBE4' },
    health: { fg: '#BE123C', bg: '#FFEEF1' },
    fitness: { fg: '#C2410C', bg: '#FFF3E8' },
    education: { fg: '#1D4ED8', bg: '#EBF3FF' },
    academics: { fg: '#0369A1', bg: '#E8F6FE' },
    hobbies: { fg: '#A21CAF', bg: '#FCEFFE' },
    social: { fg: '#A64B06', bg: '#FFF7E0' },
    logic: { fg: '#6D28D9', bg: '#F3EFFF' },
    analytics: { fg: '#0E7490', bg: '#E5FAFD' },
    mindfulness: { fg: '#7E22CE', bg: '#F8F0FF' },
    family: { fg: '#BE185D', bg: '#FDEEF6' },
  },
  dark: {
    career: { fg: '#A5B4FC', bg: '#1E1B4B' },
    financial: { fg: '#6EE7B7', bg: '#06302A' },
    investments: { fg: '#BEF264', bg: '#1C2E07' },
    health: { fg: '#FDA4AF', bg: '#4C0519' },
    fitness: { fg: '#FDBA74', bg: '#431407' },
    education: { fg: '#93C5FD', bg: '#172554' },
    academics: { fg: '#7DD3FC', bg: '#082F49' },
    hobbies: { fg: '#F0ABFC', bg: '#4A044E' },
    social: { fg: '#FCD34D', bg: '#451A03' },
    logic: { fg: '#C4B5FD', bg: '#2E1065' },
    analytics: { fg: '#67E8F9', bg: '#083344' },
    mindfulness: { fg: '#D8B4FE', bg: '#3B0764' },
    family: { fg: '#F9A8D4', bg: '#500724' },
  },
};
