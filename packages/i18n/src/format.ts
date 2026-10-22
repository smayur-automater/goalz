/** Locale-aware formatting. Thin wrappers over Intl so every screen formats the same way. */

export type UnitSystem = 'metric' | 'imperial';

export interface RegionDefaults {
  currency: string;
  units: UnitSystem;
  /** 0 = Sunday, 1 = Monday. */
  weekStart: 0 | 1 | 6;
}

const REGION_DEFAULTS: Record<string, RegionDefaults> = {
  AU: { currency: 'AUD', units: 'metric', weekStart: 1 },
  NZ: { currency: 'NZD', units: 'metric', weekStart: 1 },
  US: { currency: 'USD', units: 'imperial', weekStart: 0 },
  CA: { currency: 'CAD', units: 'metric', weekStart: 0 },
  GB: { currency: 'GBP', units: 'metric', weekStart: 1 },
  IE: { currency: 'EUR', units: 'metric', weekStart: 1 },
  IN: { currency: 'INR', units: 'metric', weekStart: 0 },
  SG: { currency: 'SGD', units: 'metric', weekStart: 0 },
  AE: { currency: 'AED', units: 'metric', weekStart: 1 },
  SA: { currency: 'SAR', units: 'metric', weekStart: 0 },
  BR: { currency: 'BRL', units: 'metric', weekStart: 0 },
  CN: { currency: 'CNY', units: 'metric', weekStart: 1 },
  JP: { currency: 'JPY', units: 'metric', weekStart: 0 },
};

const FALLBACK_DEFAULTS: RegionDefaults = { currency: 'USD', units: 'metric', weekStart: 1 };

/** Sensible defaults for a region. The user can override each one in Settings. */
export function regionDefaults(region: string | undefined): RegionDefaults {
  return REGION_DEFAULTS[region?.toUpperCase() ?? ''] ?? FALLBACK_DEFAULTS;
}

export function formatNumber(locale: string, value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** `value` is a fraction: 0.5 → "50%". */
export function formatPercent(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatCurrency(locale: string, value: number, currency: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/** Formats a calendar date (no time), e.g. a check-in's local_date "2026-10-22". */
export function formatDate(
  locale: string,
  isoDate: string,
  style: 'short' | 'medium' | 'long' = 'medium',
): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Noon UTC keeps the calendar day stable in every time zone.
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: 'UTC' }).format(date);
}

export function formatTime(locale: string, date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(date);
}

/** Measurements are stored in metric; these convert for display. */
export type Quantity = 'distance' | 'weight' | 'volume';

const UNITS: Record<Quantity, Record<UnitSystem, { unit: string; fromMetric: number }>> = {
  distance: {
    metric: { unit: 'kilometer', fromMetric: 1 },
    imperial: { unit: 'mile', fromMetric: 0.621371 },
  },
  weight: {
    metric: { unit: 'kilogram', fromMetric: 1 },
    imperial: { unit: 'pound', fromMetric: 2.20462 },
  },
  volume: {
    metric: { unit: 'liter', fromMetric: 1 },
    imperial: { unit: 'fluid-ounce', fromMetric: 33.814 },
  },
};

export function convertFromMetric(quantity: Quantity, metricValue: number, system: UnitSystem) {
  return metricValue * UNITS[quantity][system].fromMetric;
}

export function convertToMetric(quantity: Quantity, value: number, system: UnitSystem) {
  return value / UNITS[quantity][system].fromMetric;
}

export function formatMeasurement(
  locale: string,
  quantity: Quantity,
  metricValue: number,
  system: UnitSystem,
): string {
  const { unit } = UNITS[quantity][system];
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(convertFromMetric(quantity, metricValue, system));
}
