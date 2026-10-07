import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  color?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, color }: Props) {
  const bg =
    variant === 'primary' ? color ?? colors.primary : variant === 'danger' ? colors.dangerSoft : colors.background;
  const fg = variant === 'primary' ? colors.primaryText : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg }, (pressed || disabled) && styles.dim]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dim: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '700' },
});
