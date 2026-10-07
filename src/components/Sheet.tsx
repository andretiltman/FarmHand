import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom-sheet style popup used for the add flow and item details. */
export function Sheet({ visible, title, subtitle, onClose, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.flex}>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    marginTop: 'auto',
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  subtitle: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
  close: { fontSize: 20, color: colors.muted, padding: 4 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
