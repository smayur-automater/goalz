import { useCallback, useEffect, useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';

/**
 * On web, show focus rings for keyboard users only (like :focus-visible).
 * Pointer and touch focus don't draw a ring. Native platforms draw their own focus.
 */
let lastInputWasKeyboard = false;
let listening = false;

function listen() {
  if (listening || Platform.OS !== 'web' || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener(
    'keydown',
    (e) => {
      if (!e.metaKey && !e.altKey && !e.ctrlKey) lastInputWasKeyboard = true;
    },
    true,
  );
  document.addEventListener('pointerdown', () => (lastInputWasKeyboard = false), true);
}

export function useFocusRing() {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  useEffect(listen, []);

  const onFocus = useCallback(() => setFocused(lastInputWasKeyboard), []);
  const onBlur = useCallback(() => setFocused(false), []);

  const ringStyle: ViewStyle | undefined = focused
    ? { outlineColor: colors.focus, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2 }
    : undefined;

  return { focusProps: { onFocus, onBlur }, ringStyle, focused };
}
