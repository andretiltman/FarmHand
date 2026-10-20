import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  compareWeeks,
  eggsPerFeed,
  GridDay,
  hasEarlier,
  monthlyTotals,
  PeriodTotals,
  weekGrid,
  weeklyTotals,
} from '../animalStats';
import { careJob, formatAmount } from '../care';
import { dayKey, formatShortDate, plural } from '../dates';
import { colors, radius, ramp } from '../theme';
import { AnimalItem } from '../types';
import { HeatGrid } from './HeatGrid';

interface Props {
  animal: AnimalItem;
}

const round1 = (n: number) => String(Math.round(n * 10) / 10);

/** How the animals are doing: this week against earlier ones, day-by-day grids, and weekly and monthly totals. */
export function AnimalStats({ animal }: Props) {
  /** How many blocks of four weeks back the grids show. */
  const [blocksBack, setBlocksBack] = useState(0);
  const [selected, setSelected] = useState<GridDay | null>(null);
  const weeks = weekGrid(animal, blocksBack);
  const first = weeks[0][0].date;
  const last = weeks[weeks.length - 1][6].date;
  const unit = animal.feedUnit;
  const hasAmounts = weeks.flat().some((d) => d.feedAmount > 0);
  const feed = careJob(animal.species, 'feed');
  const others = animal.care.filter((k) => k !== 'feed').map((k) => ({ kind: k, job: careJob(animal.species, k) }));
  const selectedKey = selected ? dayKey(selected.date) : null;
  const select = (d: GridDay) => setSelected(selectedKey === dayKey(d.date) ? null : d);
  const shift = (delta: number) => {
    setBlocksBack(blocksBack + delta);
    setSelected(null);
  };
  const canEarlier = hasEarlier(animal, blocksBack);
  const pick = { selected: selectedKey, onSelect: select };

  return (
    <View>
      {animal.tracksEggs && <ThisWeek animal={animal} />}

      <View style={styles.range}>
        <Pressable
          onPress={() => shift(1)}
          disabled={!canEarlier}
          hitSlop={8}
          style={[styles.nav, !canEarlier && styles.dim]}
          accessibilityRole="button"
          accessibilityLabel="Earlier four weeks"
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.rangeText}>
          {formatShortDate(first)} – {formatShortDate(last)}
        </Text>
        <Pressable
          onPress={() => shift(-1)}
          disabled={blocksBack === 0}
          hitSlop={8}
          style={[styles.nav, blocksBack === 0 && styles.dim]}
          accessibilityRole="button"
          accessibilityLabel="Later four weeks"
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      {selected && <DayDetails day={selected} animal={animal} />}

      {animal.tracksEggs && (
        <HeatGrid title="🥚 Eggs" weeks={weeks} value={(d) => d.eggs} shades={ramp(colors.animalSoft, colors.animal)} {...pick} />
      )}
      {(animal.care.includes('feed') || hasAmounts) && (
        <HeatGrid
          title={`${feed.emoji} ${feed.verb}${hasAmounts && unit ? ` (${unit})` : hasAmounts ? '' : ' (times)'}`}
          weeks={weeks}
          value={(d) => (hasAmounts ? d.feedAmount : d.care.feed)}
          format={round1}
          shades={ramp(feed.soft, feed.color)}
          {...pick}
        />
      )}
      {others.map(({ kind, job }) => (
        <HeatGrid
          key={kind}
          title={`${job.emoji} ${job.verb}`}
          weeks={weeks}
          value={(d) => d.care[kind]}
          shades={ramp(job.soft, job.color)}
          {...pick}
        />
      ))}

      {animal.tracksEggs && (
        <Periods title="Eggs by week" periods={sinceStart(weeklyTotals(animal, 8))} unit={unit} label={(p) => formatShortDate(p.start)} />
      )}
      {animal.tracksEggs && (
        <Periods title="Eggs by month" periods={sinceStart(monthlyTotals(animal, 6))} unit={unit} label={monthLabel} />
      )}
    </View>
  );
}

/** Leaves out the empty weeks or months before anything was logged (but always keeps the current one). */
function sinceStart(periods: PeriodTotals[]): PeriodTotals[] {
  const first = periods.findIndex((p) => p.eggs > 0 || p.feedings > 0);
  return periods.slice(first < 0 ? periods.length - 1 : first);
}

/** "Oct", or "Dec 2025" for another year. */
function monthLabel(p: PeriodTotals): string {
  const year = p.start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined;
  return p.start.toLocaleDateString(undefined, { month: 'short', year });
}

/** "23 eggs so far this week · ▲ 15% on last week". */
function ThisWeek({ animal }: { animal: AnimalItem }) {
  const c = compareWeeks(animal);
  const up = c.change !== null && c.change > 0;
  const down = c.change !== null && c.change < 0;
  const ratio = eggsPerFeed(c.thisWeek);
  return (
    <View style={styles.headline}>
      <Text style={styles.headlineValue}>{plural(c.thisWeek.eggs, 'egg')}</Text>
      <Text style={styles.headlineLabel}>this week so far ({plural(c.thisWeek.daysSoFar, 'day')})</Text>
      <Text style={[styles.change, { color: up ? colors.plant : down ? colors.danger : colors.muted }]}>
        {c.change === null
          ? 'Nothing to compare with last week yet'
          : `${up ? '▲' : down ? '▼' : '='} ${Math.abs(c.change)}% vs the same ${plural(c.thisWeek.daysSoFar, 'day')} last week`}
      </Text>
      <Text style={styles.sub}>
        Last week {plural(c.lastWeek.eggs, 'egg')} · {round1(c.perDay)} a day now
        {c.perDayBefore !== null ? ` vs ${round1(c.perDayBefore)} over the 4 weeks before` : ''}
        {ratio ? ` · ${round1(ratio.value)} eggs per ${ratio.per === 'amount' ? (animal.feedUnit ?? 'unit of feed') : 'feeding'}` : ''}
      </Text>
    </View>
  );
}

/** One day's numbers, after tapping its cell. */
function DayDetails({ day, animal }: { day: GridDay; animal: AnimalItem }) {
  const parts: string[] = [];
  if (animal.tracksEggs) parts.push(`🥚 ${plural(day.eggs, 'egg')}`);
  for (const k of animal.care) {
    const job = careJob(animal.species, k);
    const n = day.care[k];
    if (k === 'feed' && day.feedAmount > 0) parts.push(`${job.emoji} ${formatAmount(day.feedAmount, animal.feedUnit)}`);
    else parts.push(`${job.emoji} ${job.past.toLowerCase()} ${n === 1 ? 'once' : `${n}×`}`);
  }
  const date = day.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View style={styles.dayBox}>
      <Text style={styles.dayTitle}>{date}</Text>
      <Text style={styles.dayText}>{parts.join('   ')}</Text>
    </View>
  );
}

/** Bars of eggs per week or month, newest at the bottom and highlighted, with eggs per feed. */
function Periods({
  title,
  periods,
  unit,
  label,
}: {
  title: string;
  periods: PeriodTotals[];
  unit?: string;
  label: (p: PeriodTotals) => string;
}) {
  const max = Math.max(1, ...periods.map((p) => p.eggs));
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      {periods.map((p, i) => {
        const current = i === periods.length - 1;
        const ratio = eggsPerFeed(p);
        return (
          <View key={label(p)} style={styles.barRow}>
            <Text style={[styles.barLabel, current && styles.bold]}>{label(p)}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { width: `${(p.eggs / max) * 100}%`, backgroundColor: current ? colors.animal : colors.animalSoft },
                ]}
              />
              <Text style={[styles.barValue, current && styles.bold]}>
                {p.eggs}
                {current ? ' so far' : ''}
              </Text>
            </View>
            <Text style={styles.barRatio}>
              {ratio ? `${round1(ratio.value)}/${ratio.per === 'amount' ? (unit ?? 'unit') : 'feed'}` : '–'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    backgroundColor: colors.animalSoft,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  headlineValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  headlineLabel: { fontSize: 13, color: colors.muted },
  change: { fontSize: 15, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' },
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
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
  rangeText: { fontSize: 16, fontWeight: '700', color: colors.text },
  dayBox: { backgroundColor: colors.background, borderRadius: radius.sm, padding: 12, marginBottom: 16 },
  dayTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  dayText: { fontSize: 14, color: colors.text },
  block: { marginBottom: 20 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { width: 64, fontSize: 13, color: colors.muted },
  barTrack: { flex: 1, height: 24, justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  barValue: { fontSize: 13, color: colors.text, paddingLeft: 6 },
  barRatio: { width: 64, fontSize: 12, color: colors.muted, textAlign: 'right' },
  bold: { fontWeight: '700', color: colors.text },
});
