import { createI18n, getDirection, I18nextProvider } from '@goalz/i18n';
import { createTheme, type AgeMode } from '@goalz/tokens';
import type { Decorator, Preview } from '@storybook/react-native-web-vite';
import { useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { ThemeProvider } from '../src';

interface ProvidersProps {
  scheme: 'light' | 'dark';
  mode: AgeMode;
  locale: string;
  children: ReactNode;
}

function Providers({ scheme, mode, locale, children }: ProvidersProps) {
  const i18n = useMemo(() => createI18n({ locale, includePseudo: true }), [locale]);
  const direction = getDirection(locale);
  const { colors } = createTheme({ scheme, mode });
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
  }, [direction, locale]);
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider colorScheme={scheme} mode={mode} direction={direction}>
        <View style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100%' }}>
          {children}
        </View>
      </ThemeProvider>
    </I18nextProvider>
  );
}

const withProviders: Decorator = (Story, context) => {
  const globals = context.globals as Omit<ProvidersProps, 'children'>;
  return (
    <Providers {...globals}>
      <Story />
    </Providers>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  globalTypes: {
    scheme: {
      description: 'Colour scheme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
    mode: {
      description: 'Age mode',
      toolbar: {
        title: 'Mode',
        icon: 'user',
        items: ['standard', 'teen', 'working', 'simple'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Locale (pseudo locales test long text and RTL)',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en-AU', title: 'English (AU)' },
          { value: 'en-XA', title: 'Pseudo: long text' },
          { value: 'ar-XB', title: 'Pseudo: right-to-left' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { scheme: 'light', mode: 'standard', locale: 'en-AU' },
  parameters: {
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
};

export default preview;
