import type { defaultNS, resources } from './locales';

// Makes t('some.key') a compile error when the key doesn't exist in English.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
  }
}
