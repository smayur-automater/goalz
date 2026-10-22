import { useTranslation } from '@goalz/i18n';
import { LIFE_AREA_KEYS, contrastRatio, type ColorRoles } from '@goalz/tokens';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, areaIcons } from './Icon';
import { Text } from './Text';

const meta = { title: 'Foundations/Tokens' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Colours() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {(Object.keys(colors) as (keyof ColorRoles)[]).map((role) => (
        <View key={role} style={{ width: 150, gap: 4 }}>
          <View
            style={{
              height: 56,
              borderRadius: 12,
              backgroundColor: colors[role],
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <Text variant="label">{role}</Text>
          <Text variant="caption" color="textMuted">
            {colors[role]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Areas() {
  const { t } = useTranslation();
  const { areas, colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {LIFE_AREA_KEYS.map((key) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 16,
            backgroundColor: areas[key].bg,
          }}
        >
          <Icon icon={areaIcons[key]} color={areas[key].fg} />
          <Text variant="bodyStrong" tint={areas[key].fg} style={{ flex: 1 }}>
            {t(`area.${key}`)}
          </Text>
          <Text variant="caption" tint={areas[key].fg}>
            {contrastRatio(areas[key].fg, areas[key].bg).toFixed(1)}:1 ·{' '}
            {contrastRatio(areas[key].fg, colors.surface).toFixed(1)}:1
          </Text>
        </View>
      ))}
    </View>
  );
}

function Type() {
  const { type } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {(Object.keys(type) as (keyof typeof type)[]).map((variant) => (
        <Text key={variant} variant={variant} heading={false}>
          {variant} · {type[variant].fontSize}/{type[variant].lineHeight}
        </Text>
      ))}
    </View>
  );
}

export const Colors: Story = { render: () => <Colours /> };
export const LifeAreas: Story = { render: () => <Areas /> };
export const Typography: Story = { render: () => <Type /> };
