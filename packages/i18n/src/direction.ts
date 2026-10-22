const RTL_LANGUAGES = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

/** Pseudo-RTL test locale used in Storybook and E2E runs. */
const RTL_PSEUDO = new Set(['ar-XB']);

export type Direction = 'ltr' | 'rtl';

export function getDirection(locale: string): Direction {
  if (RTL_PSEUDO.has(locale)) return 'rtl';
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? '';
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
}

export function isRTL(locale: string): boolean {
  return getDirection(locale) === 'rtl';
}
