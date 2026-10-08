import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARE, CARE_KINDS, careEvery } from '../care';
import { colors } from '../theme';
import { CareKind } from '../types';
import { Stepper } from './Stepper';

interface Props {
  care: CareKind[];
  careEvery: Partial<Record<CareKind, number>>;
  tracksEggs: boolean;
  onChange: (care: CareKind[], tracksEggs: boolean) => void;
  onChangeEvery: (kind: CareKind, days: number) => void;
}

/** Pick what an animal needs (feeding, walks, grooming, rides, egg collecting) and how often. */
export function CarePicker(props: Props) {
  const { care, tracksEggs, onChange } = props;
  const toggle = (kind: CareKind) =>
    onChange(
      CARE_KINDS.filter((k) => (k === kind ? !care.includes(k) : care.includes(k))),
      tracksEggs,
    );

  return (
    <View>
      <View style={styles.chips}>
        {CARE_KINDS.map((k) => (
          <CareChip
            key={k}
            label={`${CARE[k].emoji} ${CARE[k].verb}`}
            on={care.includes(k)}
            onPress={() => toggle(k)}
          />
        ))}
        <CareChip label="🥚 Eggs" on={tracksEggs} onPress={() => onChange(care, !tracksEggs)} />
      </View>
      {CARE_KINDS.filter((k) => care.includes(k)).map((k) => {
        const days = careEvery(props, k);
        return (
          <View key={k} style={styles.row}>
            <Text style={styles.rowLabel}>
              {CARE[k].emoji} {CARE[k].verb} every
            </Text>
            <Stepper
              label={`${CARE[k].verb} interval`}
              value={days}
              onChange={(d) => props.onChangeEvery(k, d)}
              suffix={days === 1 ? 'day' : 'days'}
            />
          </View>
        );
      })}
    </View>
  );
}

function CareChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="checkbox"
      aria-checked={on}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>
        {on ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.animal, borderColor: colors.animal },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  chipTextOn: { color: colors.primaryText },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  rowLabel: { fontSize: 14, color: colors.text },
});
