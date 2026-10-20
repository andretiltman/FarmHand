import { careJob } from './care';
import { addDays, dayKey, daysBetween, startOfWeek } from './dates';
import { AnimalItem, CareKind } from './types';

/** What an animal entry produced and was given on one day. */
export interface DayTotals {
  /** Midday on the day (safe from daylight-saving shifts). */
  date: Date;
  eggs: number;
  /** Feed given, summed over feedings that recorded an amount. */
  feedAmount: number;
  /** How many times each job was done. */
  care: Record<CareKind, number>;
}

export interface GridDay extends DayTotals {
  /** Later than today, or before the animals were added: shown blank. */
  outside: boolean;
  isToday: boolean;
}

export const GRID_WEEKS = 4;

const noCare = (): Record<CareKind, number> => ({ feed: 0, walk: 0, groom: 0, ride: 0, clean: 0 });

/** Totals for each of `days` days from `from`, in order. */
export function dailyTotals(animal: AnimalItem, from: Date, days: number): DayTotals[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  const out: DayTotals[] = [];
  const byKey = new Map<string, DayTotals>();
  for (let i = 0; i < days; i++) {
    const day: DayTotals = { date: addDays(start, i), eggs: 0, feedAmount: 0, care: noCare() };
    out.push(day);
    byKey.set(dayKey(day.date), day);
  }
  for (const e of animal.eggs) {
    const day = byKey.get(dayKey(new Date(e.date)));
    if (day) day.eggs += e.count;
  }
  for (const kind of Object.keys(noCare()) as CareKind[]) {
    for (const l of animal[careJob(animal.species, kind).field]) {
      const day = byKey.get(dayKey(new Date(l.date)));
      if (!day) continue;
      day.care[kind]++;
      if (kind === 'feed' && l.amount) day.feedAmount += l.amount;
    }
  }
  return out;
}

/**
 * Four Monday-to-Sunday weeks as rows of 7 days, ending with the current week
 * (or `blocksBack` blocks of four weeks earlier).
 */
export function weekGrid(animal: AnimalItem, blocksBack = 0, now: Date = new Date()): GridDay[][] {
  const from = addDays(startOfWeek(now), -7 * (GRID_WEEKS - 1 + GRID_WEEKS * blocksBack));
  const created = new Date(animal.createdAt);
  const days = dailyTotals(animal, from, 7 * GRID_WEEKS).map((d) => {
    const fromToday = daysBetween(now, d.date);
    // Logged before the entry's date (e.g. a transfer) still counts.
    const empty = d.eggs === 0 && d.feedAmount === 0 && Object.values(d.care).every((n) => n === 0);
    return { ...d, isToday: fromToday === 0, outside: fromToday > 0 || (empty && daysBetween(created, d.date) < 0) };
  });
  return Array.from({ length: GRID_WEEKS }, (_, w) => days.slice(w * 7, w * 7 + 7));
}

/** Whether there's anything logged before the given 4-week block, so it's worth stepping back to. */
export function hasEarlier(animal: AnimalItem, blocksBack: number, now: Date = new Date()): boolean {
  const from = addDays(startOfWeek(now), -7 * (GRID_WEEKS - 1 + GRID_WEEKS * blocksBack));
  const firsts = [
    animal.createdAt,
    animal.eggs[animal.eggs.length - 1]?.date,
    ...(['feedings', 'walks', 'groomings', 'rides', 'cleanings'] as const).map((f) => animal[f][animal[f].length - 1]?.date),
  ].filter((d): d is string => !!d);
  return firsts.some((d) => daysBetween(new Date(d), from) > 0);
}

/** Eggs and feed over a stretch of days. */
export interface PeriodTotals {
  start: Date;
  /** Days in the period so far (fewer than its length for the current week or month). */
  daysSoFar: number;
  eggs: number;
  feedAmount: number;
  feedings: number;
}

function sum(days: DayTotals[], start: Date, daysSoFar: number): PeriodTotals {
  return {
    start,
    daysSoFar,
    eggs: days.reduce((n, d) => n + d.eggs, 0),
    feedAmount: days.reduce((n, d) => n + d.feedAmount, 0),
    feedings: days.reduce((n, d) => n + d.care.feed, 0),
  };
}

/** The last `count` Monday-to-Sunday weeks, oldest first; the last is the current week so far. */
export function weeklyTotals(animal: AnimalItem, count = 8, now: Date = new Date()): PeriodTotals[] {
  const thisWeek = startOfWeek(now);
  const from = addDays(thisWeek, -7 * (count - 1));
  const days = dailyTotals(animal, from, 7 * count);
  return Array.from({ length: count }, (_, w) => {
    const start = addDays(from, 7 * w);
    const soFar = w === count - 1 ? daysBetween(thisWeek, now) + 1 : 7;
    return sum(days.slice(w * 7, w * 7 + soFar), start, soFar);
  });
}

/** The last `count` calendar months, oldest first; the last is the current month so far. */
export function monthlyTotals(animal: AnimalItem, count = 6, now: Date = new Date()): PeriodTotals[] {
  const out: PeriodTotals[] = [];
  for (let m = count - 1; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const length = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const soFar = m === 0 ? now.getDate() : length;
    out.push(sum(dailyTotals(animal, start, soFar), start, soFar));
  }
  return out;
}

export interface WeekComparison {
  thisWeek: PeriodTotals;
  lastWeek: PeriodTotals;
  /** This week's eggs against last week's over the same number of days (Monday to today), in percent. */
  change: number | null;
  /** Eggs a day this week, and over the four weeks before it. */
  perDay: number;
  perDayBefore: number | null;
}

/** How this week's laying compares with last week (like for like) and the four weeks before. */
export function compareWeeks(animal: AnimalItem, now: Date = new Date()): WeekComparison {
  const weeks = weeklyTotals(animal, 5, now);
  const thisWeek = weeks[4];
  const lastWeek = weeks[3];
  const lastWeekSoFar = dailyTotals(animal, lastWeek.start, thisWeek.daysSoFar).reduce((n, d) => n + d.eggs, 0);
  const before = weeks.slice(0, 4).filter((w) => w.eggs > 0);
  return {
    thisWeek,
    lastWeek,
    change: lastWeekSoFar > 0 ? Math.round(((thisWeek.eggs - lastWeekSoFar) / lastWeekSoFar) * 100) : null,
    perDay: thisWeek.eggs / thisWeek.daysSoFar,
    perDayBefore: before.length ? before.reduce((n, w) => n + w.eggs, 0) / (before.length * 7) : null,
  };
}

/** Eggs per unit of feed (when amounts were recorded), else per feeding; null when there's nothing to compare. */
export function eggsPerFeed(p: Pick<PeriodTotals, 'eggs' | 'feedAmount' | 'feedings'>): { value: number; per: 'amount' | 'feeding' } | null {
  if (p.feedAmount > 0) return { value: p.eggs / p.feedAmount, per: 'amount' };
  if (p.feedings > 0) return { value: p.eggs / p.feedings, per: 'feeding' };
  return null;
}

/** 0 for nothing, else 1–4 by quarter of the best value shown. */
export function shade(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as 1 | 2 | 3 | 4;
}
