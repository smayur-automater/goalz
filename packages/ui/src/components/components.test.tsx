import { AGE_MODES } from '@goalz/tokens';
import { fireEvent, screen } from '@testing-library/react';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { expectNoAxeViolations, renderUi } from '../test/render';
import { Button, IconButton } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { Input } from './Input';
import { ProgressBar, ProgressRing } from './Progress';
import { Sheet } from './Sheet';
import { Text } from './Text';

describe('Button', () => {
  it('has a role and accessible name, and fires onPress', () => {
    const onPress = vi.fn();
    renderUi(<Button label="Log it" icon={Plus} onPress={onPress} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log it' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('announces disabled and busy states and ignores presses', () => {
    const onPress = vi.fn();
    renderUi(<Button label="Save" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('hides its label visually in Standard mode', () => {
    renderUi(<IconButton icon={Plus} label="Add goal" />);
    expect(screen.getByRole('button', { name: 'Add goal' })).toBeInTheDocument();
    expect(screen.queryByText('Add goal')).not.toBeInTheDocument();
  });

  it('shows a visible text label in Simple mode', () => {
    renderUi(<IconButton icon={Plus} label="Add goal" />, { mode: 'simple' });
    expect(screen.getByText('Add goal')).toBeVisible();
  });
});

describe('Card', () => {
  it('becomes a single named button when pressable', () => {
    const onPress = vi.fn();
    renderUi(
      <Card onPress={onPress} accessibilityLabel="Drink water, 3 of 8 glasses">
        <Text>Drink water</Text>
      </Card>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Drink water, 3 of 8 glasses' }));
    expect(onPress).toHaveBeenCalledOnce();
  });
});

describe('Input', () => {
  it('is labelled and described by its hint', () => {
    renderUi(<Input label="Goal name" hint="Keep it short and specific" />);
    const input = screen.getByRole('textbox', { name: 'Goal name' });
    expect(input).toHaveAccessibleDescription('Keep it short and specific');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('announces errors in text, not just colour', () => {
    renderUi(<Input label="Target" error="Enter a number" />);
    const input = screen.getByRole('textbox', { name: 'Target' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Error: Enter a number');
  });

  it('marks optional fields', () => {
    renderUi(<Input label="Why it matters" optional />);
    expect(screen.getByText('(Optional)', { exact: false })).toBeInTheDocument();
  });
});

describe('ProgressRing', () => {
  it('exposes value to assistive tech and shows the number', () => {
    renderUi(<ProgressRing value={0.4} label="Today" />);
    const ring = screen.getByRole('progressbar', { name: 'Today' });
    expect(ring).toHaveAttribute('aria-valuenow', '40');
    expect(ring).toHaveAttribute('aria-valuetext', 'Today: 40% complete');
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('clamps out-of-range and invalid values', () => {
    renderUi(
      <>
        <ProgressRing value={1.7} label="Over" />
        <ProgressRing value={Number.NaN} label="Invalid" />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByRole('progressbar', { name: 'Invalid' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });
});

describe('ProgressBar', () => {
  it('uses custom value text in both the visible and spoken value', () => {
    renderUi(<ProgressBar value={0.4} label="Emergency fund" valueText="$4,000 of $10,000" />);
    const bar = screen.getByRole('progressbar', { name: 'Emergency fund' });
    expect(bar).toHaveAttribute('aria-valuetext', '$4,000 of $10,000, 40% complete');
    expect(screen.getByText('$4,000 of $10,000')).toBeInTheDocument();
  });
});

describe('Chip', () => {
  function Toggle() {
    const [on, setOn] = useState(false);
    return <Chip label="Fitness" selected={on} onPress={() => setOn(!on)} />;
  }

  it('acts as a checkbox and toggles', () => {
    renderUi(<Toggle />);
    const chip = screen.getByRole('checkbox', { name: 'Fitness' });
    expect(chip).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Sheet', () => {
  it('is a labelled modal dialog with a close button', () => {
    const onClose = vi.fn();
    renderUi(
      <Sheet visible title="Log progress" onClose={onClose}>
        <Text>Body</Text>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Log progress' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with Escape on web', () => {
    const onClose = vi.fn();
    renderUi(
      <Sheet visible title="Log progress" onClose={onClose}>
        <Text>Body</Text>
      </Sheet>,
    );
    fireEvent.keyUp(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders nothing when hidden', () => {
    renderUi(
      <Sheet visible={false} title="Hidden" onClose={() => {}}>
        <Text>Body</Text>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Text', () => {
  it('marks large variants as headings with the right level', () => {
    renderUi(
      <>
        <Text variant="h1">Today</Text>
        <Text variant="h3">Habits</Text>
        <Text>Plain</Text>
      </>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Habits' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Plain' })).not.toBeInTheDocument();
  });
});

function KitchenSink() {
  return (
    <View>
      <Text variant="h1">Today</Text>
      <ProgressRing value={0.6} label="Today's habits" />
      <Card accent="#4338CA">
        <ProgressBar value={0.3} label="Read 20 books" valueText="6 of 20" />
      </Card>
      <Card onPress={() => {}} accessibilityLabel="Meditate, done">
        <Text>Meditate</Text>
      </Card>
      <Input label="Amount" hint="In dollars" />
      <Input label="Note" error="Too long" optional />
      <Chip label="Career" selected />
      <Chip label="Health" />
      <Button label="Save" />
      <Button label="Cancel" variant="secondary" />
      <IconButton icon={Plus} label="Add" />
    </View>
  );
}

describe('accessibility (axe)', () => {
  const cases = AGE_MODES.flatMap((mode) => [
    [mode, 'light'],
    [mode, 'dark'],
  ]) as [(typeof AGE_MODES)[number], 'light' | 'dark'][];

  it.each(cases)('%s mode, %s scheme has no violations', async (mode, scheme) => {
    const { container } = renderUi(<KitchenSink />, { mode, scheme });
    await expectNoAxeViolations(container);
  });

  it('has no violations with an open sheet', async () => {
    renderUi(
      <Sheet visible title="Log progress" onClose={() => {}} footer={<Button label="Save" />}>
        <Input label="Amount" />
      </Sheet>,
    );
    await expectNoAxeViolations(document.body);
  });

  it('renders right-to-left with the pseudo-RTL locale', async () => {
    const { container } = renderUi(<KitchenSink />, { locale: 'ar-XB', direction: 'rtl' });
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    await expectNoAxeViolations(container);
  });
});
