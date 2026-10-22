import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  args: { label: 'Goal name', placeholder: 'e.g. Walk 30 minutes, 4 days a week' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = { args: { hint: 'Specific goals are easier to track.' } };
export const WithError: Story = {
  args: { label: 'Target amount', error: 'Enter a number', keyboardType: 'numeric' },
};
export const Optional: Story = {
  args: { label: 'Why it matters', optional: true, multiline: true },
};
