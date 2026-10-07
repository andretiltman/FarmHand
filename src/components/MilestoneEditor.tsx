import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Crop } from '../crops';
import { daysBetween, formatShortDate, plural } from '../dates';
import { growthStatus, isCustomized, MilestoneKey, milestoneBounds, resetMilestone, setMilestoneDate } from '../growth';
import { colors, radius } from '../theme';
import { Growth } from '../types';
import { Button } from './Button';
import { Calendar } from './Calendar';

const QUESTION: Record<MilestoneKey, string> = {
  sown: 'When was it sown?',
  seedling: 'When did it sprout?',
  transplant: 'When was it transplanted?',
  harvest: 'When was it harvested?',
};

interface Props {
  growth: Growth;
  crop: Crop | undefined;
  stepKey: MilestoneKey;
  onSave: (growth: Growth) => void;
  onCancel: () => void;
}

/** Lets the user record when a stage happened, or move its estimate to suit their variety. */
export function MilestoneEditor({ growth, crop, stepKey, onSave, onCancel }: Props) {
  const status = growthStatus(growth);
  const index = status.steps.findIndex((s) => s.key === stepKey);
  const step = status.steps[index];
  const next = status.steps[index + 1];
  const { min, max } = milestoneBounds(status.steps, stepKey);
  const [date, setDate] = useState(() => {
    if (min && daysBetween(min, step.date) < 0) return min;
    if (max && daysBetween(step.date, max) < 0) return max;
    return step.date;
  });

  const now = new Date();
  const happened = daysBetween(date, now) >= 0;
  const label = step.label.toLowerCase();
  let preview: string;
  if (stepKey === 'sown') preview = `🌰 Sown on ${formatShortDate(date)}`;
  else if (happened) preview = `✅ Marks ${label} as done on ${formatShortDate(date)}`;
  else preview = `📅 Expect ${label} on ${formatShortDate(date)} (in ${plural(daysBetween(now, date), 'day')})`;

  const canReset = isCustomized(growth, stepKey, crop) && !(next?.done && !next.estimated);

  return (
    <View>
      <Text style={styles.question}>{QUESTION[stepKey]}</Text>
      <Text style={styles.help}>
        {stepKey === 'sown'
          ? 'Moving the sowing date shifts all the estimates after it.'
          : min && daysBetween(now, min) > 0
            ? `It can't happen before the ${status.steps[index - 1].label.toLowerCase()} stage, so pick a date to change the estimate for your variety.`
            : 'Pick the day it happened, or a future date to change the estimate for your variety.'}
      </Text>
      <View style={styles.calendar}>
        <Calendar value={date} onChange={setDate} min={min} max={max} />
      </View>
      <Text style={styles.preview}>{preview}</Text>
      {canReset && (
        <Text
          style={styles.reset}
          onPress={() => onSave(resetMilestone(growth, stepKey, crop))}
          accessibilityRole="button"
        >
          ↺ Reset to the usual {crop?.name.toLowerCase() ?? 'crop'} timing
        </Text>
      )}
      <View style={styles.buttons}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} />
        <Button label="Save" onPress={() => onSave(setMilestoneDate(growth, stepKey, date, now))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 18, fontWeight: '700', color: colors.text },
  help: { fontSize: 13, color: colors.muted, marginTop: 4 },
  calendar: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 8,
  },
  preview: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' },
  reset: { fontSize: 14, fontWeight: '600', color: colors.water, marginTop: 12, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
