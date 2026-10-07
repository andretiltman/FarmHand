import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
}

/** A − value + control for small whole numbers. */
export function Stepper({ value, onChange, min = 1, max = 365, suffix, label }: Props) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => set(value - 1)}
        disabled={value <= min}
        style={({ pressed }) => [styles.btn, (pressed || value <= min) && styles.dim]}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`${label}: ${value}`}>
        {value}
        {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
      </Text>
      <Pressable
        onPress={() => set(value + 1)}
        disabled={value >= max}
        style={({ pressed }) => [styles.btn, (pressed || value >= max) && styles.dim]}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.5 },
  btnText: { fontSize: 22, color: colors.text, fontWeight: '600' },
  value: { minWidth: 90, textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text },
  suffix: { fontSize: 15, fontWeight: '400', color: colors.muted },
});
