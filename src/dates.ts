const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between two dates (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** "5 Sep", with the year added when it isn't this year. */
export function formatShortDate(d: Date, now: Date = new Date()): string {
  const year = d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year });
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "12 days", or "~5 months" / "~2 years" for long stretches. */
export function formatDays(days: number): string {
  if (days <= 90) return plural(days, 'day');
  const months = days / 30.4;
  if (months < 23.5) return `~${Math.round(months)} months`;
  return `~${Math.round((days / 365) * 2) / 2} years`;
}

/** formatDays prefixed with "~" (once). */
export function approxDays(days: number): string {
  const text = formatDays(days);
  return text.startsWith('~') ? text : `~${text}`;
}

export function isSameDay(iso: string, ref: Date = new Date()): boolean {
  return daysBetween(new Date(iso), ref) === 0;
}

export function isWithinLastDays(iso: string, days: number, ref: Date = new Date()): boolean {
  const diff = daysBetween(new Date(iso), ref);
  return diff >= 0 && diff < days;
}

export function relativeDay(iso: string, ref: Date = new Date()): string {
  const diff = daysBetween(new Date(iso), ref);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff > 1) return `${diff} days ago`;
  return 'in the future';
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
