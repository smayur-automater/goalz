import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ArrowRight, Plus, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, IconButton } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { label: 'Log it', variant: 'primary', loading: false, disabled: false },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', label: 'Cancel' } };
export const Ghost: Story = { args: { variant: 'ghost', label: 'Skip for now' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Delete goal', icon: Trash2 } };
export const Loading: Story = { args: { loading: true, label: 'Saving' } };
export const WithIcon: Story = {
  args: { label: 'Continue', icon: ArrowRight, iconMirrorInRTL: true },
};
export const FullWidth: Story = { args: { fullWidth: true, label: 'Create my first goal' } };

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Button label="Primary" />
      <Button label="Secondary" variant="secondary" />
      <Button label="Ghost" variant="ghost" />
      <Button label="Danger" variant="danger" />
      <Button label="Disabled" disabled />
      <IconButton icon={Plus} label="Add goal" />
    </View>
  ),
};
