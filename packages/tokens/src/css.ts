import { LIFE_AREA_KEYS } from './areas';
import { createTheme, type ColorScheme } from './theme';

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** CSS custom properties for one scheme, for the Next.js marketing site and any plain-CSS surface. */
export function cssVariables(scheme: ColorScheme, highContrast = false): Record<string, string> {
  const theme = createTheme({ scheme, mode: 'standard', highContrast });
  const vars: Record<string, string> = {};
  for (const [role, value] of Object.entries(theme.colors)) {
    vars[`--color-${kebab(role)}`] = value;
  }
  for (const key of LIFE_AREA_KEYS) {
    vars[`--area-${key}`] = theme.areas[key].fg;
    vars[`--area-${key}-bg`] = theme.areas[key].bg;
  }
  return vars;
}

/**
 * A stylesheet that follows the OS colour scheme, with `data-theme` overrides
 * so the user's in-app choice wins.
 */
export function cssStylesheet(): string {
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
  const lightVars = block(cssVariables('light'));
  const darkVars = block(cssVariables('dark'));
  return [
    `:root, [data-theme="light"] {\n${lightVars}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${darkVars}\n  }\n}`,
    `[data-theme="dark"] {\n${darkVars}\n}`,
  ].join('\n\n');
}
