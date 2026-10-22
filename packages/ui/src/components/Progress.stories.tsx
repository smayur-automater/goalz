import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ProgressBar, ProgressRing } from './Progress';
import { Text } from './Text';

const meta = {
  title: 'Components/Progress',
  component: ProgressRing,
  args: { value: 0.6, label: "Today's habits", size: 'lg' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ring: Story = {};

export const RingSizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <ProgressRing value={0.25} label="Small" size="sm" />
      <ProgressRing value={0.5} label="Medium" size="md" />
      <ProgressRing value={0.75} label="Large" size="lg" />
    </View>
  ),
};

export const RingCustomCentre: Story = {
  render: () => (
    <ProgressRing value={3 / 5} label="Habits done today" size="lg">
      <Text variant="h3">3/5</Text>
    </ProgressRing>
  ),
};

function Bars() {
  const { areas } = useTheme();
  return (
    <View style={{ gap: 20, maxWidth: 420 }}>
      <ProgressBar
        value={0.4}
        label="Emergency fund"
        valueText="$4,000 of $10,000"
        color={areas.financial.fg}
      />
      <ProgressBar
        value={6 / 20}
        label="Read 20 books"
        valueText="6 of 20"
        color={areas.education.fg}
      />
      <ProgressBar value={0.9} label="Run 5 km" color={areas.fitness.fg} />
    </View>
  );
}

export const Bar: Story = { render: () => <Bars /> };
