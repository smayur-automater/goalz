import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Sheet } from './Sheet';
import { Text } from './Text';

const meta = {
  title: 'Components/Sheet',
  component: Sheet,
  args: { visible: false, title: 'Log progress', onClose: () => {}, children: null },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button label="Open sheet" onPress={() => setOpen(true)} />
      <Sheet
        visible={open}
        title="Log progress"
        onClose={() => setOpen(false)}
        footer={<Button label="Save" fullWidth onPress={() => setOpen(false)} />}
      >
        <Text color="textMuted">Emergency fund: $4,000 of $10,000</Text>
        <Input label="Amount added" keyboardType="numeric" />
        <Input label="Note" optional multiline />
      </Sheet>
    </>
  );
}

export const LogProgress: Story = { render: () => <Demo /> };
