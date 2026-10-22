import { LIFE_AREA_KEYS } from './areas';
import { light } from './colors';
import { fontFamily, radius, space, typeScale } from './scale';

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Tailwind / NativeWind preset. Colours point at CSS variables (see css.ts),
 * so `bg-surface` switches with the theme without `dark:` variants.
 */
export const goalzPreset = {
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(
          Object.keys(light).map((role) => [kebab(role), `var(--color-${kebab(role)})`]),
        ),
        area: Object.fromEntries(
          LIFE_AREA_KEYS.flatMap((key) => [
            [key, `var(--area-${key})`],
            [`${key}-bg`, `var(--area-${key}-bg)`],
          ]),
        ),
      },
      spacing: Object.fromEntries(Object.entries(space).map(([k, v]) => [k, `${v}px`])),
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, `${v}px`])),
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([k, v]) => [
          k,
          [`${v.fontSize}px`, { lineHeight: `${v.lineHeight}px`, fontWeight: v.fontWeight }],
        ]),
      ),
      fontFamily: {
        sans: [fontFamily.sans, 'system-ui', 'sans-serif'],
        hyperlegible: [fontFamily.hyperlegible, fontFamily.sans, 'system-ui', 'sans-serif'],
      },
    },
  },
};
