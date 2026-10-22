import { areaColors, type AreaColor, type LifeAreaKey } from './areas';
import { dark, darkHighContrast, light, lightHighContrast, type ColorRoles } from './colors';
import { modes, type AgeMode, type ModeConfig } from './modes';
import {
  fontFamily,
  motion,
  radius,
  shadow,
  space,
  typeScale,
  type SpaceKey,
  type TypeStyle,
  type TypeVariant,
} from './scale';

export type ColorScheme = 'light' | 'dark';

export interface ThemeInput {
  scheme: ColorScheme;
  mode: AgeMode;
  /** OS "increase contrast" setting. Simple mode always uses high contrast. */
  highContrast?: boolean;
  reduceMotion?: boolean;
}

export interface Theme {
  scheme: ColorScheme;
  mode: AgeMode;
  modeConfig: ModeConfig;
  colors: ColorRoles;
  areas: Record<LifeAreaKey, AreaColor>;
  type: Record<TypeVariant, TypeStyle>;
  space: Record<SpaceKey, number>;
  radius: typeof radius;
  shadow: typeof shadow;
  /** Durations in ms; all 0 when reduce motion is on. */
  motion: typeof motion | Record<keyof typeof motion, 0>;
  fontFamily: string;
  reduceMotion: boolean;
}

function scaleType(config: ModeConfig): Record<TypeVariant, TypeStyle> {
  const out = {} as Record<TypeVariant, TypeStyle>;
  for (const key of Object.keys(typeScale) as TypeVariant[]) {
    const base = typeScale[key];
    const fontSize = Math.max(config.minFontSize, Math.round(base.fontSize * config.fontScale));
    const lineHeight = Math.round(fontSize * (base.lineHeight / base.fontSize));
    out[key] = { ...base, fontSize, lineHeight };
  }
  return out;
}

function scaleSpace(density: number): Record<SpaceKey, number> {
  const out = {} as Record<SpaceKey, number>;
  for (const key of Object.keys(space) as unknown as SpaceKey[]) {
    out[key] = Math.round(space[key] * density);
  }
  return out;
}

export function createTheme({
  scheme,
  mode,
  highContrast = false,
  reduceMotion = false,
}: ThemeInput): Theme {
  const modeConfig = modes[mode];
  const hc = highContrast || modeConfig.highContrast;
  const colors =
    scheme === 'dark' ? (hc ? darkHighContrast : dark) : hc ? lightHighContrast : light;
  return {
    scheme,
    mode,
    modeConfig,
    colors,
    areas: areaColors[scheme],
    type: scaleType(modeConfig),
    space: scaleSpace(modeConfig.density),
    radius,
    shadow,
    motion: reduceMotion ? { fast: 0, base: 0, slow: 0, celebrate: 0 } : motion,
    fontFamily: fontFamily[modeConfig.fontFamily],
    reduceMotion,
  };
}
