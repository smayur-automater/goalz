import { areaColors } from '@goalz/tokens';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';
import { Icon, areaIcons } from './Icon';
import { ProgressBar } from './Progress';
import { Text } from './Text';

const meta = {
  title: 'Components/Card',
  component: Card,
  args: { children: null },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

function HabitCard() {
  const { areas } = useTheme();
  return (
    <Card accent={areas.health.fg} onPress={() => {}}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ backgroundColor: areas.health.bg, borderRadius: 12, padding: 8 }}>
          <Icon icon={areaIcons.health} color={areas.health.fg} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="bodyStrong">Drink water</Text>
          <ProgressBar value={3 / 8} label="Today" valueText="3 of 8 glasses" />
        </View>
      </View>
    </Card>
  );
}

export const Habit: Story = { render: () => <HabitCard /> };

export const Static: Story = {
  render: () => (
    <Card>
      <Text variant="title">Why it matters</Text>
      <Text color="textMuted">I want to keep up with my kids at the park.</Text>
    </Card>
  ),
};

export const AreaAccents: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      {(['career', 'financial', 'fitness'] as const).map((key) => (
        <Card key={key} accent={areaColors.light[key].fg}>
          <Text variant="bodyStrong">{key}</Text>
        </Card>
      ))}
    </View>
  ),
};
