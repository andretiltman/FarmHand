const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between two dates (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
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
