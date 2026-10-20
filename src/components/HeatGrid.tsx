import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GridDay, shade } from '../animalStats';
import { dayKey, formatShortDate } from '../dates';
import { colors, radius } from '../theme';

interface Props {
  title: string;
  /** Rows of 7 days, Monday first (see weekGrid). */
  weeks: GridDay[][];
  /** The number a day scores, e.g. eggs laid. */
  value: (day: GridDay) => number;
  /** How a day's number is written, e.g. "1.5". */
  format?: (n: number) => string;
  /** Five cell colours from "nothing" to "best" (see ramp). */
  shades: string[];
  /** The day tapped (dayKey), whose details show under the grids. */
  selected: string | null;
  onSelect: (day: GridDay) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Days as coloured cells, darker the better the day went, with the best day starred. */
export function HeatGrid({ title, weeks, value, format = String, shades, selected, onSelect }: Props) {
  const days = weeks.flat().filter((d) => !d.outside);
  const max = Math.max(0, ...days.map(value));
  const total = days.reduce((n, d) => n + value(d), 0);
  // Only one day is starred – the latest best one – and only when some days went better than others.
  const scored = days.filter((d) => value(d) > 0);
  const best = scored.some((d) => value(d) < max) ? [...scored].reverse().find((d) => value(d) === max) : undefined;
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.total}>{format(total)} in 4 weeks</Text>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={[styles.cell, styles.weekday]}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={dayKey(week[0].date)} style={styles.row}>
          {week.map((d) => {
            const key = dayKey(d.date);
            if (d.outside) return <View key={key} style={[styles.cell, styles.box, styles.outside]} />;
            const n = value(d);
            const level = shade(n, max);
            const isBest = d === best;
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(d)}
                style={[
                  styles.cell,
                  styles.box,
                  { backgroundColor: shades[level] },
                  d.isToday && styles.today,
                  selected === key && styles.selected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${formatShortDate(d.date)}: ${format(n)}${isBest ? ', best day' : ''}`}
              >
                <Text style={[styles.value, level >= 3 && styles.valueOnDark]}>{n > 0 ? format(n) : ''}</Text>
                {isBest && <Text style={[styles.star, level >= 3 && styles.valueOnDark]}>★</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {shades.map((c) => (
          <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendText}>More · ★ best day</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  total: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  box: { height: 40, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  outside: { backgroundColor: colors.background },
  today: { borderColor: colors.text },
  selected: { borderColor: colors.water },
  value: { fontSize: 14, fontWeight: '700', color: colors.text },
  valueOnDark: { color: colors.primaryText },
  star: { position: 'absolute', top: 1, right: 3, fontSize: 10, color: colors.text },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  legendText: { fontSize: 12, color: colors.muted },
  swatch: { width: 14, height: 14, borderRadius: 3 },
});
