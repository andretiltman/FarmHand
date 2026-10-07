import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysBetween } from '../dates';
import { colors, radius } from '../theme';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function sameDay(a: Date, b: Date): boolean {
  return daysBetween(a, b) === 0;
}

/** A simple month-grid date picker (Monday first). */
export function Calendar({ value, onChange, min, max }: Props) {
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (month.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1, 12)),
  ];
  while (cells.length % 7) cells.push(null);

  const isDisabled = (d: Date) => (min && daysBetween(min, d) < 0) || (max && daysBetween(d, max) < 0);
  const shift = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const lastOfPrev = new Date(month.getFullYear(), month.getMonth(), 0);
  const firstOfNext = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canPrev = !min || daysBetween(min, lastOfPrev) >= 0;
  const canNext = !max || daysBetween(firstOfNext, max) >= 0;

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          onPress={() => shift(-1)}
          disabled={!canPrev}
          hitSlop={8}
          style={[styles.nav, !canPrev && styles.dim]}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <Pressable
          onPress={() => shift(1)}
          disabled={!canNext}
          hitSlop={8}
          style={[styles.nav, !canNext && styles.dim]}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={[styles.cell, styles.weekday]}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`blank-${i}`} style={styles.cell} />;
          const disabled = isDisabled(d);
          const selected = sameDay(d, value);
          const isToday = sameDay(d, today);
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => onChange(d)}
              disabled={disabled}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityLabel={d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              aria-selected={selected}
              aria-disabled={disabled}
            >
              <View style={[styles.day, isToday && styles.today, selected && styles.selected]}>
                <Text style={[styles.dayText, disabled && styles.disabledText, selected && styles.selectedText]}>
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  navText: { fontSize: 24, color: colors.text, lineHeight: 28 },
  dim: { opacity: 0.3 },
  month: { fontSize: 16, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'center', lineHeight: 42 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1, borderColor: colors.plant },
  selected: { backgroundColor: colors.plant },
  dayText: { fontSize: 15, color: colors.text },
  disabledText: { color: colors.border },
  selectedText: { color: colors.primaryText, fontWeight: '700' },
});
