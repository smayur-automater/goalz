import { useTranslation } from '@goalz/i18n';
import { X } from 'lucide-react-native';
import { useId, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned below the scrolling content, e.g. the primary action. */
  footer?: ReactNode;
  /** Extra bottom padding for the device's safe area (pass the inset from the app). */
  bottomInset?: number;
}

/**
 * Bottom sheet. Closes with the close button, the system back gesture/button,
 * Escape on web, or tapping the backdrop. Focus is trapped while open.
 */
export function Sheet({ visible, onClose, title, children, footer, bottomInset = 0 }: SheetProps) {
  const { t } = useTranslation();
  const { colors, radius, space, reduceMotion } = useTheme();
  const titleId = useId();
  // On web, react-native-web's Modal is already the role="dialog" element; name it
  // from our title instead of nesting a second dialog. Native uses accessibilityViewIsModal.
  const webDialogProps = Platform.OS === 'web' ? ({ 'aria-labelledby': titleId } as object) : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      {...webDialogProps}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop: a convenience for pointer users, hidden from assistive tech. */}
        <Pressable
          onPress={onClose}
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.scrim,
          }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '90%',
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
            paddingBottom: space[4] + bottomInset,
          }}
        >
          <View
            aria-hidden
            style={{
              alignSelf: 'center',
              width: 40,
              height: 5,
              borderRadius: radius.pill,
              backgroundColor: colors.border,
              marginTop: space[2],
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingStart: space[5],
              paddingEnd: space[2],
              paddingTop: space[2],
              gap: space[2],
            }}
          >
            <Text variant="title" heading nativeID={titleId} style={{ flexShrink: 1 }}>
              {title}
            </Text>
            <IconButton icon={X} label={t('a11y.closeSheet')} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: space[5],
              paddingVertical: space[3],
              gap: space[4],
            }}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ paddingHorizontal: space[5], paddingTop: space[2] }}>{footer}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
