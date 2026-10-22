import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, PSEUDO_LOCALES, defaultNS, resources } from './locales';

export * from './direction';
export * from './format';
export { DEFAULT_LOCALE, PSEUDO_LOCALES, SUPPORTED_LOCALES, defaultNS, resources } from './locales';
export type { PseudoLocale } from './locales';
export { I18nextProvider, Trans, useTranslation } from 'react-i18next';

export interface CreateI18nOptions {
  locale?: string;
  /** Adds the pseudo locales. Never enable in production builds. */
  includePseudo?: boolean;
}

/**
 * Creates an isolated, synchronously initialised i18next instance.
 * Each app root (and each test) gets its own instance.
 */
export function createI18n({
  locale = DEFAULT_LOCALE,
  includePseudo = false,
}: CreateI18nOptions = {}): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: { 'en-XA': ['en'], 'ar-XB': ['en'], default: ['en'] },
    resources: includePseudo ? { ...resources, ...PSEUDO_LOCALES } : resources,
    defaultNS,
    ns: [defaultNS],
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
  });
  return instance;
}
