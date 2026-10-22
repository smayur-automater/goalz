import { createI18n, I18nextProvider } from '@goalz/i18n';
import type { AgeMode } from '@goalz/tokens';
import { render, type RenderOptions } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';
import { ThemeProvider, type Direction } from '../theme/ThemeProvider';

export interface Options extends RenderOptions {
  mode?: AgeMode;
  scheme?: 'light' | 'dark';
  locale?: string;
  direction?: Direction;
}

export function renderUi(
  ui: ReactElement,
  {
    mode = 'standard',
    scheme = 'light',
    locale = 'en-AU',
    direction = 'ltr',
    ...options
  }: Options = {},
) {
  const i18n = createI18n({ locale, includePseudo: true });
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider colorScheme={scheme} mode={mode} direction={direction}>
        <div dir={direction}>{ui}</div>
      </ThemeProvider>
    </I18nextProvider>,
    options,
  );
}

/**
 * Runs axe on the document. Colour contrast is checked in @goalz/tokens instead,
 * because jsdom has no layout engine to compute it.
 */
export async function expectNoAxeViolations(container: Element = document.body) {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = result.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`,
  );
  expect(summary).toEqual([]);
}
