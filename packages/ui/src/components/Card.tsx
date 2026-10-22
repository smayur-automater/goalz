import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusRing } from '../theme/focus';
import { useTheme } from '../theme/ThemeProvider';

export interface CardProps {
  children: ReactNode;
  /**
   * Makes the whole card one tap target. By default its visible text becomes its
   * accessible name. Only pass `accessibilityLabel` to add context, and start it with
   * the visible text (WCAG 2.5.3 Label in Name).
   */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Colour of the accent strip on the leading edge, e.g. a life-area colour. */
  accent?: string;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accent,
  elevated = true,
  style,
}: CardProps) {
  const { colors, radius, space, shadow, scheme, modeConfig } = useTheme();
  const { focusProps, ringStyle } = useFocusRing();

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space[4],
    // Dark mode separates surfaces with a border instead of a shadow.
    borderWidth: scheme === 'dark' || modeConfig.highContrast ? 1 : 0,
    borderColor: colors.border,
    boxShadow: elevated && scheme === 'light' ? shadow.md : undefined,
    borderStartWidth: accent ? 6 : undefined,
    borderStartColor: accent,
    minHeight: onPress ? modeConfig.minTouchTarget : undefined,
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      {...focusProps}
      style={({ pressed }) => [
        base,
        pressed ? { backgroundColor: colors.surfaceAlt } : null,
        ringStyle,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
