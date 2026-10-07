import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatShortDate } from '../dates';
import { JourneyStep } from '../growth';
import { colors } from '../theme';

/** Seed → Seedling → (Transplant) → Harvest, with dates (estimates prefixed with ~). */
export function Journey({ steps }: { steps: JourneyStep[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <View style={styles.row} accessibilityRole="summary">
      {steps.map((s, i) => {
        const isCurrent = i === current;
        return (
          <Fragment key={s.key}>
            {i > 0 && <View style={[styles.line, steps[i].done && styles.lineDone]} />}
            <View
              style={styles.step}
              accessibilityLabel={`${s.label}: ${s.done ? 'done' : isCurrent ? 'next' : 'later'}, ${
                s.estimated ? 'around ' : ''
              }${formatShortDate(s.date)}`}
            >
              <View style={[styles.dot, s.done && styles.dotDone, isCurrent && styles.dotCurrent]}>
                <Text style={[styles.emoji, !s.done && !isCurrent && styles.faded]}>{s.emoji}</Text>
              </View>
              <Text style={[styles.label, (s.done || isCurrent) && styles.labelActive]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.date}>
                {s.estimated ? '~' : ''}
                {formatShortDate(s.date)}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const DOT = 40;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', width: 70 },
  line: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border, marginTop: DOT / 2 - 1 },
  lineDone: { backgroundColor: colors.plant },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotDone: { backgroundColor: colors.plantSoft, borderColor: colors.plant },
  dotCurrent: { borderColor: colors.warning, backgroundColor: colors.surface },
  emoji: { fontSize: 18 },
  faded: { opacity: 0.4 },
  label: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  labelActive: { color: colors.text },
  date: { fontSize: 11, color: colors.muted },
});
