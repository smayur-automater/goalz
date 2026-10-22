import type { ColorRoles, TypeVariant } from '@goalz/tokens';
import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const HEADING_LEVEL: Partial<Record<TypeVariant, number>> = {
  display: 1,
  h1: 1,
  h2: 2,
  h3: 3,
  title: 4,
};

const WEB_FALLBACK = ', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: keyof ColorRoles;
  /** Raw colour override, e.g. a life-area colour. Must meet contrast against its background. */
  tint?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  /** Marks the text as a heading for screen readers. Defaults on for display/h1/h2/h3. */
  heading?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  tint,
  align,
  heading,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const t = theme.type[variant];
  const level = HEADING_LEVEL[variant];
  const isHeading = heading ?? (level !== undefined && variant !== 'title');

  return (
    <RNText
      role={isHeading ? 'heading' : undefined}
      aria-level={isHeading ? (level ?? 2) : undefined}
      // OS text scaling stays on: layouts must cope with 200% text.
      allowFontScaling
      style={[
        {
          color: tint ?? theme.colors[color],
          fontFamily:
            Platform.OS === 'web' ? `"${theme.fontFamily}"${WEB_FALLBACK}` : theme.fontFamily,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          fontWeight: t.fontWeight,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
