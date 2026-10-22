import { formatPercent, useTranslation } from '@goalz/i18n';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

function useAnimatedProgress(value: number) {
  const { motion } = useTheme();
  const anim = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, value, motion.slow]);
  return anim;
}

const RING_SIZES = { sm: 48, md: 96, lg: 160 } as const;

export interface ProgressRingProps {
  /** Fraction complete, 0 to 1. */
  value: number;
  /** Accessible name, e.g. "Today's habits". */
  label: string;
  size?: keyof typeof RING_SIZES;
  color?: string;
  /** Replaces the default percentage in the centre. */
  children?: ReactNode;
}

export function ProgressRing({ value, label, size = 'md', color, children }: ProgressRingProps) {
  const { t, i18n } = useTranslation();
  const { colors, type } = useTheme();
  const v = clamp01(value);
  const pct = Math.round(v * 100);
  const px = RING_SIZES[size];
  const stroke = Math.max(6, Math.round(px / 10));
  const r = (px - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const anim = useAnimatedProgress(v);
  const dashOffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View
      role="progressbar"
      accessible
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={t('a11y.progressRing', { label, value: pct })}
      style={{ width: px, height: px, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute' }}
      >
        <Svg width={px} height={px} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={px / 2}
            cy={px / 2}
            r={r}
            stroke={colors.surfaceAlt}
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            cx={px / 2}
            cy={px / 2}
            r={r}
            stroke={color ?? colors.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            fill="none"
          />
        </Svg>
      </View>
      {/* The number is always shown, so progress never relies on colour alone. */}
      {children ??
        (size !== 'sm' ? (
          <Text
            variant={size === 'lg' ? 'h2' : 'bodyStrong'}
            aria-hidden
            style={
              size === 'lg' ? undefined : { fontSize: Math.min(type.bodyStrong.fontSize, px / 4) }
            }
          >
            {formatPercent(i18n.language, v)}
          </Text>
        ) : null)}
    </View>
  );
}

export interface ProgressBarProps {
  value: number;
  /** Accessible name and, unless `hideLabel`, visible label. */
  label: string;
  /** Visible text on the trailing side, e.g. "$4,000 of $10,000". Defaults to the percentage. */
  valueText?: string;
  hideLabel?: boolean;
  color?: string;
}

export function ProgressBar({ value, label, valueText, hideLabel, color }: ProgressBarProps) {
  const { t, i18n } = useTranslation();
  const { colors, radius, space, modeConfig } = useTheme();
  const v = clamp01(value);
  const pct = Math.round(v * 100);
  const anim = useAnimatedProgress(v);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const shown = valueText ?? formatPercent(i18n.language, v);
  const height = modeConfig.highContrast ? 12 : 8;

  return (
    <View
      role="progressbar"
      accessible
      accessibilityLabel={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={
        valueText
          ? `${valueText}, ${t('progress.percent', { value: pct })}`
          : t('progress.percent', { value: pct })
      }
      style={{ gap: space[1] }}
    >
      {hideLabel ? null : (
        <View
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}
        >
          <Text variant="label" style={{ flexShrink: 1 }}>
            {label}
          </Text>
          <Text variant="label" color="textMuted">
            {shown}
          </Text>
        </View>
      )}
      <View
        style={{
          height,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
          borderWidth: modeConfig.highContrast ? 1 : 0,
          borderColor: colors.borderStrong,
        }}
      >
        <Animated.View
          style={{
            width,
            height: '100%',
            borderRadius: radius.pill,
            backgroundColor: color ?? colors.primary,
          }}
        />
      </View>
    </View>
  );
}
