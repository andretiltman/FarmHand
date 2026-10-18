import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime, WEEK_ORDER, WEEKDAYS } from '../schedule';
import { colors, radius } from '../theme';
import { TaskSchedule } from '../types';
import { Stepper } from './Stepper';

const TASK_INTERVALS: { days: number; label: string }[] = [
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Fortnightly' },
  { days: 30, label: 'Monthly' },
  { days: 90, label: 'Every 3 months' },
  { days: 180, label: 'Every 6 months' },
  { days: 365, label: 'Yearly' },
];
const MINUTES = ['00', '15', '30', '45'];
const DEFAULT_TIME = '08:00';

interface Props {
  everyDays: number;
  /** Absent when the task repeats every `everyDays`. */
  schedule: TaskSchedule | undefined;
  onChangeEvery: (days: number) => void;
  onChangeSchedule: (schedule: TaskSchedule | undefined) => void;
}

/** How a maintenance task repeats: every so many days, or on set days of the week (optionally at a set time). */
export function ScheduleEditor({ everyDays, schedule, onChangeEvery, onChangeSchedule }: Props) {
  const [hour, minute] = (schedule?.time ?? DEFAULT_TIME).split(':');
  const setTime = (h: number, m: string) =>
    schedule && onChangeSchedule({ ...schedule, time: `${String((h + 24) % 24).padStart(2, '0')}:${m}` });
  const toggleDay = (d: number) => {
    if (!schedule) return;
    const days = schedule.days.includes(d) ? schedule.days.filter((x) => x !== d) : [...schedule.days, d];
    // Keep at least one day picked.
    if (days.length) onChangeSchedule({ ...schedule, days: WEEK_ORDER.filter((x) => days.includes(x)) });
  };

  return (
    <View>
      <View style={styles.chips}>
        <Chip label="Every few days" selected={!schedule} onPress={() => onChangeSchedule(undefined)} />
        <Chip
          label="On set days"
          selected={!!schedule}
          onPress={() => !schedule && onChangeSchedule({ days: [new Date().getDay()] })}
        />
      </View>

      {schedule ? (
        <>
          <Text style={styles.label}>On</Text>
          <View style={styles.days}>
            {WEEK_ORDER.map((d) => (
              <Chip
                key={d}
                label={WEEKDAYS[d]}
                selected={schedule.days.includes(d)}
                onPress={() => toggleDay(d)}
                compact
              />
            ))}
          </View>

          <Text style={styles.label}>At</Text>
          <View style={styles.chips}>
            <Chip
              label="Any time"
              selected={!schedule.time}
              onPress={() => onChangeSchedule({ ...schedule, time: undefined })}
            />
            <Chip
              label="Set a time"
              selected={!!schedule.time}
              onPress={() => !schedule.time && onChangeSchedule({ ...schedule, time: DEFAULT_TIME })}
            />
          </View>
          {schedule.time && (
            <View style={styles.spaced}>
              <View style={styles.timeRow}>
                <StepButton label="−" a11y="Earlier hour" onPress={() => setTime(Number(hour) - 1, minute)} />
                <Text style={styles.time} accessibilityLabel={`Time: ${formatTime(schedule.time)}`}>
                  {formatTime(schedule.time)}
                </Text>
                <StepButton label="+" a11y="Later hour" onPress={() => setTime(Number(hour) + 1, minute)} />
              </View>
              <View style={styles.chips}>
                {MINUTES.map((m) => (
                  <Chip key={m} label={`:${m}`} selected={minute === m} onPress={() => setTime(Number(hour), m)} />
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.spaced}>
            <Stepper
              label="Repeat interval"
              value={everyDays}
              onChange={onChangeEvery}
              suffix={everyDays === 1 ? 'day' : 'days'}
            />
          </View>
          <View style={styles.chips}>
            {TASK_INTERVALS.map((t) => (
              <Chip key={t.days} label={t.label} selected={everyDays === t.days} onPress={() => onChangeEvery(t.days)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Chip(props: { label: string; selected: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.compact && styles.compact, props.selected && styles.chipOn]}
      accessibilityRole="button"
      aria-selected={props.selected}
    >
      <Text style={[styles.chipText, props.selected && styles.chipTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

function StepButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 14 },
  spaced: { marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  days: { flexDirection: 'row', gap: 4 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  compact: { flex: 1, paddingHorizontal: 0, alignItems: 'center' },
  chipOn: { backgroundColor: colors.task, borderColor: colors.task },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  chipTextOn: { color: colors.primaryText },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  time: { minWidth: 110, textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text },
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
  pressed: { opacity: 0.5 },
  btnText: { fontSize: 22, color: colors.text, fontWeight: '600' },
});
