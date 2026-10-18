import { addDays, daysBetween, isSameDay } from './dates';
import { TaskSchedule } from './types';

/** Sunday first, matching Date.getDay(). */
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday first, for pickers. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Ignores anything malformed (e.g. from a file sent by a newer version), so it falls back to "every N days". */
export function validSchedule(s: TaskSchedule | undefined): TaskSchedule | undefined {
  if (!s || !Array.isArray(s.days)) return undefined;
  const days = [...new Set(s.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  if (!days.length) return undefined;
  const time = typeof s.time === 'string' && /^\d{2}:\d{2}$/.test(s.time) ? s.time : undefined;
  return { days: WEEK_ORDER.filter((d) => days.includes(d)), time };
}

/** "08:00" → "8:00 AM" (or "08:00", depending on the phone's settings). */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Saturday", "Mon & Thu", "Mon, Wed & Fri" or "day". */
function dayList(days: number[]): string {
  if (days.length === 7) return 'day';
  if (days.length === 1) return WEEKDAY_NAMES[days[0]];
  const names = days.map((d) => WEEKDAYS[d]);
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** "every Saturday at 8:00 AM". */
export function describeSchedule(s: TaskSchedule): string {
  return `every ${dayList(s.days)}${s.time ? ` at ${formatTime(s.time)}` : ''}`;
}

/** "Sat 8:00 AM" – short enough for a stat tile. */
export function shortSchedule(s: TaskSchedule): string {
  const days = s.days.length === 7 ? 'Daily' : s.days.map((d) => WEEKDAYS[d]).join(', ');
  return s.time ? `${days} ${formatTime(s.time)}` : days;
}

/** The scheduled time on a given day (midnight when no time is set). */
function slotOn(day: Date, time: string | undefined): Date {
  const [h, m] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

/** The most recent scheduled day on or before `ref`'s day. */
function slotOnOrBefore(s: TaskSchedule, ref: Date): Date {
  for (let i = 0; i < 7; i++) {
    const day = addDays(ref, -i);
    if (s.days.includes(day.getDay())) return slotOn(day, s.time);
  }
  return slotOn(ref, s.time);
}

/** The next scheduled day after `ref`'s day. */
function slotAfter(s: TaskSchedule, ref: Date): Date {
  for (let i = 1; i <= 7; i++) {
    const day = addDays(ref, i);
    if (s.days.includes(day.getDay())) return slotOn(day, s.time);
  }
  return slotOn(addDays(ref, 7), s.time);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** "today", "tomorrow", "Sat" or "next Sat". */
function whenLabel(slot: Date, now: Date): string {
  const days = daysBetween(now, slot);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `${days < 7 ? '' : 'next '}${WEEKDAYS[slot.getDay()]}`;
}

export interface ScheduleStatus {
  status: 'ok' | 'due' | 'overdue';
  daysUntilDue: number;
  dueLabel: string;
}

/**
 * Where a task done on set days of the week stands.
 * It's due on the scheduled day and overdue once that day has passed without it being done.
 * Doing it the day before (e.g. putting the bins out the night before collection) counts for that day.
 */
export function scheduleStatus(
  s: TaskSchedule,
  lastDone: string | undefined,
  createdAt: string,
  now: Date = new Date(),
): ScheduleStatus {
  const at = s.time ? ` at ${formatTime(s.time)}` : '';
  const current = slotOnOrBefore(s, now);
  const previous = slotOnOrBefore(s, addDays(current, -1));
  // Done since the day before the current slot (but not on the previous slot's own day).
  const windowStart = new Date(
    Math.max(addDays(startOfDay(current), -1).getTime(), addDays(startOfDay(previous), 1).getTime()),
  );
  const doneFor = !!lastDone && new Date(lastDone) >= windowStart;
  // A task added after its slot (or later on a day with no time set) starts with the next one.
  const addedAfter = new Date(createdAt) > (s.time ? current : addDays(startOfDay(current), 1));
  if (doneFor || addedAfter) {
    const next = slotAfter(s, current);
    return { status: 'ok', daysUntilDue: daysBetween(now, next), dueLabel: `Due ${whenLabel(next, now)}${at}` };
  }
  if (isSameDay(current.toISOString(), now)) {
    return { status: 'due', daysUntilDue: 0, dueLabel: `Due today${at}` };
  }
  const days = daysBetween(current, now);
  return {
    status: 'overdue',
    daysUntilDue: -days,
    dueLabel: days === 1 ? 'Missed yesterday' : `Missed on ${WEEKDAYS[current.getDay()]}`,
  };
}
