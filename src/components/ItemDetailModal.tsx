import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDateTime } from '../dates';
import { animalSummary, plantSummary } from '../stats';
import { colors, radius } from '../theme';
import { TrackedItem } from '../types';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  item: TrackedItem | null;
  onClose: () => void;
  onWater: (id: string) => void;
  onLogEggs: (id: string, count: number) => void;
  onUndo: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ItemDetailModal({ item, onClose, onWater, onLogEggs, onUndo, onDelete }: Props) {
  const [eggCount, setEggCount] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEggCount(1);
    setConfirmDelete(false);
  }, [item?.id]);

  if (!item) return null;
  const isPlant = item.kind === 'plant';

  let stats: { label: string; value: string }[];
  let history: { key: string; text: string }[];
  if (item.kind === 'plant') {
    const s = plantSummary(item);
    stats = [
      { label: 'Schedule', value: `Every ${item.waterEveryDays}d` },
      { label: 'Status', value: s.dueLabel },
      { label: 'Times watered', value: String(item.waterings.length) },
    ];
    history = item.waterings.map((d, i) => ({ key: `${d}-${i}`, text: `💧  ${formatDateTime(d)}` }));
  } else {
    const s = animalSummary(item);
    stats = [
      { label: 'Today', value: String(s.today) },
      { label: 'Last 7 days', value: String(s.last7Days) },
      { label: 'All time', value: String(s.total) },
    ];
    history = item.eggs.map((e, i) => ({
      key: `${e.date}-${i}`,
      text: `🥚  ${e.count} egg${e.count === 1 ? '' : 's'} · ${formatDateTime(e.date)}`,
    }));
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      subtitle={isPlant ? 'Plant' : `${item.headCount} × ${item.species}`}
      title={`${isPlant ? '🪴' : '🐔'}  ${item.name}`}
      footer={
        confirmDelete ? (
          <>
            <Button label="Cancel" variant="secondary" onPress={() => setConfirmDelete(false)} />
            <Button
              label="Yes, delete"
              variant="danger"
              onPress={() => {
                onDelete(item.id);
                onClose();
              }}
            />
          </>
        ) : (
          <Button label={`Delete ${isPlant ? 'plant' : 'animals'}`} variant="danger" onPress={() => setConfirmDelete(true)} />
        )
      }
    >
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {isPlant ? (
        <View style={styles.actionRow}>
          <Button label="💧  Watered now" color={colors.water} onPress={() => onWater(item.id)} />
        </View>
      ) : (
        <View style={styles.eggRow}>
          <Stepper label="Eggs collected" value={eggCount} onChange={setEggCount} max={200} suffix="eggs" />
          <View style={styles.eggBtn}>
            <Button
              label="Log"
              color={colors.animal}
              onPress={() => {
                onLogEggs(item.id, eggCount);
                setEggCount(1);
              }}
            />
          </View>
        </View>
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>History</Text>
        {history.length > 0 && (
          <Text style={styles.undo} onPress={() => onUndo(item.id)} accessibilityRole="button">
            Undo last
          </Text>
        )}
      </View>
      <ScrollView style={styles.history}>
        {history.length === 0 ? (
          <Text style={styles.empty}>{isPlant ? 'No waterings logged yet.' : 'No eggs logged yet.'}</Text>
        ) : (
          history.map((h) => (
            <Text key={h.key} style={styles.historyItem}>
              {h.text}
            </Text>
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  actionRow: { flexDirection: 'row', marginTop: 16 },
  eggRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  eggBtn: { flex: 1, flexDirection: 'row' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  undo: { fontSize: 14, color: colors.water, fontWeight: '600' },
  history: { maxHeight: 220 },
  historyItem: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: 8 },
});
