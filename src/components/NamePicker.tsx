import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CareJob, joinNames } from '../care';
import { colors, radius } from '../theme';

/** The animals' names as removable chips, plus a box to add another. */
export function NamesEditor({ names, onChange }: { names: string[]; onChange: (names: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const name = draft.trim();
    if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) onChange([...names, name]);
    setDraft('');
  };

  return (
    <View>
      {names.length > 0 && (
        <View style={styles.chips}>
          {names.map((n) => (
            <Pressable
              key={n}
              onPress={() => onChange(names.filter((x) => x !== n))}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${n}`}
            >
              <Text style={styles.chipText}>{n} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={names.length ? 'Add another name' : 'Add a name, e.g. Annie'}
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

interface WhoProps {
  job: CareJob;
  names: string[];
  who: string[];
  onChange: (who: string[]) => void;
}

/** Tick which of the named animals a feeding, walk, … was for. */
export function WhoPicker({ job, names, who, onChange }: WhoProps) {
  const all = names.every((n) => who.includes(n));
  const toggle = (name: string) => onChange(names.filter((n) => (n === name ? !who.includes(n) : who.includes(n))));
  const rows: { label: string; on: boolean; onPress: () => void }[] = [
    { label: 'All', on: all, onPress: () => onChange(all ? [] : names) },
    ...names.map((n) => ({ label: n, on: who.includes(n), onPress: () => toggle(n) })),
  ];

  return (
    <View>
      {rows.map((r, i) => (
        <Pressable
          key={r.label + i}
          onPress={r.onPress}
          style={({ pressed }) => [styles.row, i === 0 && styles.allRow, pressed && styles.pressed]}
          accessibilityRole="checkbox"
          aria-checked={r.on}
          accessibilityLabel={r.label}
        >
          <View style={[styles.box, r.on && styles.boxOn]}>{r.on && <Text style={styles.tick}>✓</Text>}</View>
          <Text style={[styles.rowText, i === 0 && styles.allText]}>{r.label}</Text>
        </Pressable>
      ))}
      <Text style={styles.preview}>
        {who.length === 0 ? 'Tick at least one' : `${job.emoji}  ${job.past} ${all ? 'all' : joinNames(names.filter((n) => who.includes(n)))}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.animalSoft,
    borderWidth: 1,
    borderColor: colors.animal,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  allRow: { borderBottomWidth: 1 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.plant, borderColor: colors.plant },
  tick: { color: colors.primaryText, fontSize: 14, fontWeight: '700' },
  rowText: { fontSize: 16, color: colors.text },
  allText: { fontWeight: '700' },
  preview: { fontSize: 15, fontWeight: '600', color: colors.plant, marginTop: 16, textAlign: 'center' },
});
