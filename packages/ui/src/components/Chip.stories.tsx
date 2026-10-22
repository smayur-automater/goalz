import { LIFE_AREA_KEYS } from '@goalz/tokens';
import { useTranslation } from '@goalz/i18n';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Chip } from './Chip';
import { areaIcons } from './Icon';

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { label: 'Fitness', selected: false },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };

function AreaPicker() {
  const { t } = useTranslation();
  const { areas } = useTheme();
  const [picked, setPicked] = useState<string[]>(['fitness', 'financial']);
  return (
    <View role="group" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {LIFE_AREA_KEYS.map((key) => (
        <Chip
          key={key}
          label={t(`area.${key}`)}
          icon={areaIcons[key]}
          tone={areas[key]}
          selected={picked.includes(key)}
          onPress={() =>
            setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))
          }
        />
      ))}
    </View>
  );
}

export const LifeAreaPicker: Story = { render: () => <AreaPicker /> };
