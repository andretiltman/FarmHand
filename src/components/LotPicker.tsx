import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { lotEmoji, sameLot } from '../lots';
import { colors, radius } from '../theme';

interface Props {
  /** Lots already in use (see lotNames). */
  lots: string[];
  value: string | undefined;
  onChange: (lot: string | undefined) => void;
}

/** Pick the lot a plant grows in, or type a new one. Tap the chosen lot again to take it out of any lot. */
export function LotPicker({ lots, value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const choices = value && !lots.some((l) => sameLot(l, value)) ? [...lots, value] : lots;

  const add = () => {
    const lot = draft.trim();
    if (lot) onChange(choices.find((l) => sameLot(l, lot)) ?? lot);
    setDraft('');
  };

  return (
    <View>
      <View style={styles.chips}>
        {choices.map((l) => {
          const on = sameLot(l, value);
          return (
            <Pressable
              key={l}
              onPress={() => onChange(on ? undefined : l)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={`Lot: ${l}`}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {on ? '✓ ' : `${lotEmoji(l)} `}
                {l}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="New lot, e.g. North field"
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={add}
        onBlur={add}
        maxLength={30}
      />
    </View>
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
  chipOn: { backgroundColor: colors.plant, borderColor: colors.plant },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  chipTextOn: { color: colors.primaryText },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
