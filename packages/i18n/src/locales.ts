import enCommon from './locales/en/common.json';
import { pseudoLocalise } from './pseudo';

/** Base English is written in Australian spelling (launch market). Other English variants override it. */
export const DEFAULT_LOCALE = 'en-AU';

export const defaultNS = 'common';

export const resources = {
  en: { common: enCommon },
} as const;

/** Development-only locales that stress-test layout: longer accented text, and right-to-left. */
export const PSEUDO_LOCALES = {
  'en-XA': { common: pseudoLocalise(enCommon) },
  'ar-XB': { common: pseudoLocalise(enCommon, { rtl: true }) },
} as const;

export type PseudoLocale = keyof typeof PSEUDO_LOCALES;

export const SUPPORTED_LOCALES = ['en-AU', 'en'] as const;
