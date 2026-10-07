import { Pressable, StyleSheet, Text, View } from 'react-native';

import { animalSummary, plantSummary, WaterStatus } from '../stats';
import { colors, radius } from '../theme';
import { TrackedItem } from '../types';

interface Props {
  item: TrackedItem;
  onPress: () => void;
  onQuickAction: () => void;
}

const statusColor: Record<WaterStatus, string> = {
  never: colors.warning,
  ok: colors.plant,
  due: colors.warning,
  overdue: colors.danger,
};

export function ItemCard({ item, onPress, onQuickAction }: Props) {
  const isPlant = item.kind === 'plant';

  let line1: string;
  let line2: string;
  let line2Color: string = colors.muted;
  if (item.kind === 'plant') {
    const s = plantSummary(item);
    line1 = `${s.lastWateredLabel} · every ${item.waterEveryDays} day${item.waterEveryDays === 1 ? '' : 's'}`;
    line2 = s.dueLabel;
    line2Color = statusColor[s.status];
  } else {
    const s = animalSummary(item);
    line1 = `${item.headCount} ${item.species.toLowerCase()}${item.headCount === 1 ? '' : 's'}`;
    line2 = `🥚 ${s.today} today · ${s.last7Days} this week`;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${line1}, ${line2}`}
    >
      <View style={[styles.icon, { backgroundColor: isPlant ? colors.plantSoft : colors.animalSoft }]}>
        <Text style={styles.iconText}>{isPlant ? '🪴' : '🐔'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {line1}
        </Text>
        <Text style={[styles.status, { color: line2Color }]} numberOfLines={1}>
          {line2}
        </Text>
      </View>
      <Pressable
        onPress={onQuickAction}
        hitSlop={8}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: isPlant ? colors.waterSoft : colors.animalSoft },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isPlant ? `Log watering for ${item.name}` : `Log one egg for ${item.name}`}
      >
        <Text style={styles.actionEmoji}>{isPlant ? '💧' : '🥚'}</Text>
        <Text style={[styles.actionLabel, { color: isPlant ? colors.water : colors.animal }]}>
          {isPlant ? 'Water' : '+1'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 24 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  action: {
    marginLeft: 10,
    width: 60,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
