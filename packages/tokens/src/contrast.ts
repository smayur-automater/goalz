/** WCAG 2.2 contrast helpers. Accepts #RGB or #RRGGBB. */

function channel(hex: string, start: number): number {
  const v = parseInt(hex.slice(start, start + 2), 16) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function normalise(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length === 3) return h.replace(/./g, (c) => c + c);
  if (h.length === 6) return h;
  throw new Error(`Unsupported colour "${hex}". Use #RGB or #RRGGBB.`);
}

export function relativeLuminance(hex: string): number {
  const h = normalise(hex);
  return 0.2126 * channel(h, 0) + 0.7152 * channel(h, 2) + 0.0722 * channel(h, 4);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Minimum ratios: normal text 4.5, large text and UI components 3 (WCAG 1.4.3 / 1.4.11), AAA text 7. */
export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;
export const AAA_TEXT = 7;
