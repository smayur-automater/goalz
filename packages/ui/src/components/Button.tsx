import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { useFocusRing } from '../theme/focus';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type LucideIcon } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Visible text. Also the accessible name. */
  label: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  /** Mirror the icon in RTL (for arrows). */
  iconMirrorInRTL?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  icon,
  iconMirrorInRTL,
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { colors, space, radius, modeConfig } = theme;
  const { focusProps, ringStyle } = useFocusRing();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.onDanger, border: colors.danger },
  }[variant];

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      {...focusProps}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: modeConfig.minTouchTarget,
          minWidth: modeConfig.minTouchTarget,
          paddingHorizontal: space[5],
          paddingVertical: space[2],
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        ringStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {loading ? (
          // The button itself is aria-busy; the spinner is decorative.
          <View aria-hidden importantForAccessibility="no-hide-descendants">
            <ActivityIndicator size="small" color={palette.fg} />
          </View>
        ) : icon ? (
          <Icon icon={icon} color={palette.fg} mirrorInRTL={iconMirrorInRTL} />
        ) : null}
        <Text variant="label" tint={palette.fg} numberOfLines={2} align="center">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: LucideIcon;
  /** Accessible name. Shown as visible text in modes that require icon labels. */
  label: string;
  showLabel?: boolean;
  mirrorInRTL?: boolean;
}

export function IconButton({ icon, label, showLabel, mirrorInRTL, ...rest }: IconButtonProps) {
  const { colors, modeConfig, radius, space } = useTheme();
  const { focusProps, ringStyle } = useFocusRing();
  const visibleLabel = showLabel ?? modeConfig.iconLabels;

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      {...focusProps}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: modeConfig.minTouchTarget,
          minWidth: modeConfig.minTouchTarget,
          paddingHorizontal: visibleLabel ? space[3] : 0,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space[1],
          backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
        },
        ringStyle,
      ]}
    >
      <Icon icon={icon} mirrorInRTL={mirrorInRTL} size={visibleLabel ? 20 : 24} />
      {visibleLabel ? (
        <Text variant="label" aria-hidden>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
