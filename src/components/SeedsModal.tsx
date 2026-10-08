import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CROPS, findCrop } from '../crops';
import { plural } from '../dates';
import { colors, radius } from '../theme';
import { OTHER_SEED, SeedPacket } from '../useSeeds';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  visible: boolean;
  onClose: () => void;
  packets: SeedPacket[];
  onAdd: (cropId: string, name: string, count: number) => void;
  onSetCount: (id: string, count: number) => void;
  onRemove: (id: string) => void;
}

const MAX_SEEDS = 9999;
const QUICK_COUNTS = [10, 25, 50, 100];

/** The seed inventory: packets on hand, and a form to add more. */
export function SeedsModal({ visible, onClose, packets, onAdd, onSetCount, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [cropId, setCropId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [count, setCount] = useState(10);

  useEffect(() => {
    if (visible) setAdding(packets.length === 0);
  }, [visible]);

  const startAdding = () => {
    setCropId(null);
    setName('');
    setCount(10);
    setAdding(true);
  };

  const chooseCrop = (id: string) => {
    const old = findCrop(cropId ?? undefined);
    // Keep a variety name the user typed, but swap in the new crop's name if it was ours.
    if (!name.trim() || name.trim() === old?.name) setName(findCrop(id)?.name ?? '');
    setCropId(id);
  };

  const trimmed = name.trim();
  const save = () => {
    if (!cropId || !trimmed) return;
    onAdd(cropId, trimmed, count);
    setAdding(false);
  };

  const total = packets.reduce((n, p) => n + p.count, 0);
  // Group packets by crop, in catalog order, with "other" seeds last.
  const order = (p: SeedPacket) => {
    const i = CROPS.findIndex((c) => c.id === p.cropId);
    return i < 0 ? CROPS.length : i;
  };
  const sorted = [...packets].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));

  if (adding) {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        subtitle="Seed inventory"
        title="Add seeds"
        footer={
          <>
            <Button
              label={packets.length ? 'Back' : 'Cancel'}
              variant="secondary"
              onPress={() => (packets.length ? setAdding(false) : onClose())}
            />
            <Button label="Add seeds" color={colors.plant} disabled={!cropId || !trimmed} onPress={save} />
          </>
        }
      >
        <ScrollView style={styles.shrink} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, styles.firstLabel]}>What seeds?</Text>
          <View style={styles.chips}>
            {CROPS.map((c) => (
              <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={cropId === c.id} onPress={() => chooseCrop(c.id)} />
            ))}
            <Chip label="🪴 Other" selected={cropId === OTHER_SEED} onPress={() => chooseCrop(OTHER_SEED)} />
          </View>

          <Text style={styles.label}>Name or variety</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={cropId === OTHER_SEED ? 'e.g. Sunflower' : 'e.g. Cherry tomato'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={60}
          />

          <Text style={styles.label}>How many seeds?</Text>
          <Stepper
            label="Number of seeds"
            value={count}
            onChange={setCount}
            max={MAX_SEEDS}
            suffix={count === 1 ? 'seed' : 'seeds'}
          />
          <View style={[styles.chips, styles.spaced]}>
            {QUICK_COUNTS.map((n) => (
              <Chip key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} />
            ))}
          </View>
          <Text style={styles.hint}>Adding seeds of the same name tops up the existing packet.</Text>
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      subtitle={`${plural(total, 'seed')} on hand`}
      title="Seed inventory"
      footer={<Button label="＋ Add seeds" color={colors.plant} onPress={startAdding} />}
    >
      <ScrollView style={styles.shrink}>
        {sorted.map((p) => {
          const crop = findCrop(p.cropId);
          return (
            <View key={p.id} style={[styles.packet, p.count === 0 && styles.empty]}>
              <Text style={styles.packetEmoji}>{crop?.emoji ?? '🌰'}</Text>
              <View style={styles.packetInfo}>
                <Text style={styles.packetName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.packetMeta}>
                  {p.count === 0 ? 'None left' : crop && crop.name !== p.name ? crop.name : 'Seeds'}
                </Text>
              </View>
              <Stepper label={`${p.name} seeds`} value={p.count} onChange={(n) => onSetCount(p.id, n)} min={0} max={MAX_SEEDS} />
              <Pressable
                onPress={() => onRemove(p.id)}
                hitSlop={8}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${p.name} seeds`}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          );
        })}
        <Text style={styles.hint}>Seeds you sow when adding a plant are taken out of here.</Text>
      </ScrollView>
    </Sheet>
  );
}

function Chip(props: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.selected && styles.chipOn]}
      accessibilityRole="button"
      aria-selected={props.selected}
    >
      <Text style={[styles.chipText, props.selected && styles.chipTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 18 },
  firstLabel: { marginTop: 0 },
  spaced: { marginTop: 10 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.plant, borderColor: colors.plant },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  chipTextOn: { color: colors.primaryText },
  packet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  empty: { opacity: 0.6 },
  packetEmoji: { fontSize: 26 },
  packetInfo: { flex: 1, minWidth: 0 },
  packetName: { fontSize: 15, fontWeight: '600', color: colors.text },
  packetMeta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  remove: { padding: 4 },
  removeText: { fontSize: 16, color: colors.muted },
});
