import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { hasTag, PLANT_TAGS, toggleTag } from '../tags';
import { colors, radius } from '../theme';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/** Toggle the suggested plant tags, or type a new one. */
export function TagPicker({ tags, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const custom = tags.filter((t) => !hasTag(PLANT_TAGS, t));

  const add = () => {
    if (draft.trim() && !hasTag(tags, draft)) onChange(toggleTag(tags, draft));
    setDraft('');
  };

  return (
    <View>
      <View style={styles.chips}>
        {[...PLANT_TAGS, ...custom].map((t) => {
          const on = hasTag(tags, t);
          return (
            <Pressable
              key={t}
              onPress={() => onChange(toggleTag(tags, t))}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="checkbox"
              aria-checked={on}
              accessibilityLabel={`Tag: ${t}`}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {on ? '✓ ' : ''}
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Add your own, e.g. Heirloom"
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={add}
        onBlur={add}
        maxLength={24}
      />
    </View>
  );
}

/** Small read-only tag pills, e.g. on a plant's card. */
export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <View style={styles.list}>
      {tags.map((t) => (
        <Text key={t} style={styles.pill} numberOfLines={1}>
          {t}
        </Text>
      ))}
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
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  pill: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.plant,
    backgroundColor: colors.plantSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
