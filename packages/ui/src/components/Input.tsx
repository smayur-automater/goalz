import { useTranslation } from '@goalz/i18n';
import { CircleAlert } from 'lucide-react-native';
import { useId, useState, type ComponentRef, type Ref } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Always-visible label. Placeholders never replace labels. */
  label: string;
  hint?: string;
  error?: string;
  /** We mark optional fields rather than required ones: most fields are required. */
  optional?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function Input({
  label,
  hint,
  error,
  optional,
  multiline,
  onFocus,
  onBlur,
  ref,
  ...rest
}: InputProps) {
  const { t } = useTranslation();
  const { colors, space, radius, type, modeConfig, fontFamily } = useTheme();
  const [focused, setFocused] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  // Web gets proper aria wiring; native gets the same information via label and hint.
  const webA11y =
    Platform.OS === 'web'
      ? { 'aria-describedby': describedBy || undefined, 'aria-invalid': error ? true : undefined }
      : {};

  return (
    <View style={{ gap: space[1] }}>
      <Text variant="label" nativeID={labelId}>
        {label}
        {optional ? (
          <Text variant="label" color="textMuted">
            {` (${t('field.optional')})`}
          </Text>
        ) : null}
      </Text>
      {hint ? (
        <Text variant="caption" color="textMuted" nativeID={hintId}>
          {hint}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={
          Platform.OS === 'web' ? undefined : [hint, error].filter(Boolean).join('. ')
        }
        aria-labelledby={labelId}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...webA11y}
        {...rest}
        style={{
          minHeight: multiline ? modeConfig.minTouchTarget * 2 : modeConfig.minTouchTarget,
          paddingHorizontal: space[4],
          paddingVertical: space[2],
          borderRadius: radius.md,
          borderWidth: focused || error ? 2 : 1.5,
          borderColor: error ? colors.danger : focused ? colors.focus : colors.borderStrong,
          backgroundColor: colors.surface,
          color: colors.text,
          fontFamily: Platform.OS === 'web' ? `"${fontFamily}", system-ui, sans-serif` : fontFamily,
          fontSize: type.body.fontSize,
          textAlignVertical: multiline ? 'top' : 'center',
          // The border change is the focus indicator; drop the browser's default ring.
          outlineStyle: 'none' as never,
        }}
      />
      {error ? (
        <View
          nativeID={errorId}
          aria-live="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}
        >
          <Icon icon={CircleAlert} size={16} color={colors.danger} />
          <Text variant="caption" color="danger" style={{ flexShrink: 1 }}>
            {t('field.error', { message: error })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
