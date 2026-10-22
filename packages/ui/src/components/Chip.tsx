import { Check } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';
import { useFocusRing } from '../theme/focus';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type LucideIcon } from './Icon';
import { Text } from './Text';

export interface ChipProps extends Omit<PressableProps, 'children' | 'style' | 'role'> {
  label: string;
  selected?: boolean;
  /** 'checkbox' for multi-select groups, 'radio' for single-select, 'button' for actions. */
  role?: 'checkbox' | 'radio' | 'button';
  icon?: LucideIcon;
  /** Life-area colours for the selected state: `fg` for text/border, `bg` for fill. */
  tone?: { fg: string; bg: string };
}

export function Chip({
  label,
  selected = false,
  role = 'checkbox',
  icon,
  tone,
  disabled,
  ...rest
}: ChipProps) {
  const { colors, radius, space, modeConfig } = useTheme();
  const { focusProps, ringStyle } = useFocusRing();
  const fg = selected ? (tone?.fg ?? colors.onPrimarySoft) : colors.text;
  const bg = selected ? (tone?.bg ?? colors.primarySoft) : colors.surface;
  const border = selected ? (tone?.fg ?? colors.primary) : colors.borderStrong;
  const isToggle = role !== 'button';

  return (
    <Pressable
      role={role}
      accessibilityLabel={label}
      aria-checked={isToggle ? selected : undefined}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      {...focusProps}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: modeConfig.minTouchTarget,
          paddingHorizontal: space[4],
          borderRadius: radius.pill,
          borderWidth: selected ? 2 : 1.5,
          borderColor: border,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          alignSelf: 'flex-start',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        ringStyle,
      ]}
    >
      {/* A check mark shows selection without relying on colour. */}
      {selected && isToggle ? (
        <Icon icon={Check} size={18} color={fg} />
      ) : icon ? (
        <Icon icon={icon} size={18} color={tone?.fg ?? fg} />
      ) : null}
      <Text variant="label" tint={fg}>
        {label}
      </Text>
    </Pressable>
  );
}
