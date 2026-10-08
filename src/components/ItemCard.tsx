import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { careStatuses, speciesEmoji } from '../care';
import { findCrop } from '../crops';
import { daysBetween, formatDays } from '../dates';
import { growthStatus } from '../growth';
import { animalSummary, DueStatus, plantSummary, taskSummary } from '../stats';
import { colors, radius } from '../theme';
import { CareKind, TrackedItem } from '../types';
import { TagList } from './TagPicker';

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
  onCare: (kind: CareKind) => void;
  onEgg: () => void;
  onDone: () => void;
}

const statusColor: Record<DueStatus, string> = {
  never: colors.warning,
  ok: colors.plant,
  due: colors.warning,
  overdue: colors.danger,
};

/** Room for this many quick-action buttons on a card. */
const MAX_ACTIONS = 2;

export function ItemCard({ item, onPress, onWater, onCare, onEgg, onDone }: Props) {

  let line1: string;
  let line2: string;
  /** Set when line 1 is a highlighted status rather than plain detail text. */
  let line1Color: string | null = null;
  let line2Color: string = colors.muted;
  let icon = item.kind === 'plant' ? '🪴' : item.kind === 'animal' ? speciesEmoji(item.species) : '🛠️';
  const iconBackground = { plant: colors.plantSoft, animal: colors.animalSoft, task: colors.taskSoft }[item.kind];
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
  } else if (item.kind === 'task') {
    const s = taskSummary(item);
    line1 = `${s.lastDoneLabel} · every ${item.everyDays === 1 ? 'day' : formatDays(item.everyDays)}`;
    line2 = s.dueLabel;
    line2Color = statusColor[s.status];
    actions = [
      {
        emoji: '✓',
        label: 'Done',
        accessibilityLabel: `Mark ${item.name} as done`,
        color: colors.task,
        soft: colors.taskSoft,
        onPress: onDone,
      },
    ];
  } else {
    const s = animalSummary(item);
    const care = careStatuses(item);
    const due = care.filter((c) => c.status !== 'ok');
    if (item.tracksEggs) line1 = `🥚 ${s.today} today, ${s.last7Days}/week`;
    else if (care.length) {
      line1 = care.map((c) => `${c.job.emoji} ${c.last ? shortAgo(c.last) : 'never'}`).join(' · ');
    } else line1 = `${item.headCount} × ${item.species}`;
    if (care.length === 1) {
      line2 = `${care[0].job.emoji} ${care[0].lastLabel}`;
      line2Color = care[0].status === 'ok' ? colors.plant : statusColor[care[0].status];
    } else if (due.length) {
      line2 = `Due: ${due.map((c) => `${c.job.emoji} ${c.job.verb}`).join(', ')}`;
      line2Color = due.some((c) => c.status === 'overdue') ? colors.danger : colors.warning;
    } else {
      line2 = care.length ? '✓ All looked after' : '';
      line2Color = colors.plant;
    }
    // Jobs that are due get the buttons first; the rest are in the details popup.
    const jobs = [...due, ...care.filter((c) => c.status === 'ok')].slice(0, MAX_ACTIONS - (item.tracksEggs ? 1 : 0));
    actions = care
      .filter((c) => jobs.includes(c))
      .map((c) => ({
        emoji: c.job.emoji,
        label: c.job.verb,
        accessibilityLabel: `Log ${c.job.verb.toLowerCase()} for ${item.name}`,
        color: colors.plant,
        soft: colors.plantSoft,
        onPress: () => onCare(c.kind),
      }));
    if (item.tracksEggs) {
      actions.push({
        emoji: '🥚',
        label: '+1',
        accessibilityLabel: `Log one egg for ${item.name}`,
        color: colors.animal,
        soft: colors.animalSoft,
        onPress: onEgg,
      });
    }
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${line1}, ${line2}`}
    >
      <View style={[styles.icon, { backgroundColor: iconBackground }]}>
        {item.kind === 'plant' && item.photos[0] ? (
          <Image source={{ uri: item.photos[0].uri }} style={styles.photo} accessibilityIgnoresInvertColors />
        ) : (
          <Text style={styles.iconText}>{icon}</Text>
        )}
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
        {item.kind === 'plant' && <TagList tags={item.tags} />}
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

/** "today" or "3d" – fits several jobs on one line. */
function shortAgo(iso: string): string {
  const days = daysBetween(new Date(iso), new Date());
  return days <= 0 ? 'today' : `${days}d`;
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
  photo: { width: 48, height: 48, borderRadius: 24 },
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
