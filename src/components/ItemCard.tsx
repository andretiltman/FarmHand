import { Pressable, StyleSheet, Text, View } from 'react-native';

import { findCrop } from '../crops';
import { growthStatus } from '../growth';
import { animalSummary, plantSummary, WaterStatus } from '../stats';
import { colors, radius } from '../theme';
import { TrackedItem } from '../types';

interface QuickAction {
  emoji: string;
  label: string;
  accessibilityLabel: string;
  color: string;
  soft: string;
  onPress: () => void;
}

interface Props {
  item: TrackedItem;
  onPress: () => void;
  onWater: () => void;
  onFeed: () => void;
  onEgg: () => void;
}

const statusColor: Record<WaterStatus, string> = {
  never: colors.warning,
  ok: colors.plant,
  due: colors.warning,
  overdue: colors.danger,
};

export function ItemCard({ item, onPress, onWater, onFeed, onEgg }: Props) {
  const isPlant = item.kind === 'plant';

  let line1: string;
  let line2: string;
  /** Set when line 1 is a highlighted status rather than plain detail text. */
  let line1Color: string | null = null;
  let line2Color: string = colors.muted;
  let icon = isPlant ? '🪴' : '🐔';
  let actions: QuickAction[];
  if (item.kind === 'plant') {
    const s = plantSummary(item);
    if (item.growth) {
      const g = growthStatus(item.growth);
      icon = findCrop(item.growth.cropId)?.emoji ?? icon;
      line1 = `${g.emoji} ${g.headline}`;
      line1Color = g.stage === 'harvested' ? colors.muted : g.needsAction ? colors.warning : colors.plant;
      line2 = `💧 ${s.dueLabel}`;
    } else {
      line1 = `${s.lastWateredLabel} · every ${item.waterEveryDays} day${item.waterEveryDays === 1 ? '' : 's'}`;
      line2 = s.dueLabel;
    }
    line2Color = statusColor[s.status];
    actions = [
      {
        emoji: '💧',
        label: 'Water',
        accessibilityLabel: `Log watering for ${item.name}`,
        color: colors.water,
        soft: colors.waterSoft,
        onPress: onWater,
      },
    ];
  } else {
    const s = animalSummary(item);
    line1 = `🥚 ${s.today} today, ${s.last7Days}/week`;
    line2 = `🌾 ${s.lastFedLabel}`;
    line2Color = s.fedToday ? colors.plant : colors.warning;
    actions = [
      {
        emoji: '🌾',
        label: 'Feed',
        accessibilityLabel: `Log feeding for ${item.name}`,
        color: colors.plant,
        soft: colors.plantSoft,
        onPress: onFeed,
      },
      {
        emoji: '🥚',
        label: '+1',
        accessibilityLabel: `Log one egg for ${item.name}`,
        color: colors.animal,
        soft: colors.animalSoft,
        onPress: onEgg,
      },
    ];
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${line1}, ${line2}`}
    >
      <View style={[styles.icon, { backgroundColor: isPlant ? colors.plantSoft : colors.animalSoft }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={line1Color ? [styles.status, { color: line1Color }] : styles.sub} numberOfLines={1}>
          {line1}
        </Text>
        <Text style={[styles.status, { color: line2Color }]} numberOfLines={1}>
          {line2}
        </Text>
      </View>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          onPress={a.onPress}
          hitSlop={4}
          style={({ pressed }) => [styles.action, { backgroundColor: a.soft }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={a.accessibilityLabel}
        >
          <Text style={styles.actionEmoji}>{a.emoji}</Text>
          <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
        </Pressable>
      ))}
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
    marginLeft: 8,
    width: 56,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
