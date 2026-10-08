import { CareLog, EggLog, hasPhotos, PlantPhoto, TrackedItem } from './types';

/**
 * Keeping two phones in sync.
 *
 * Each phone keeps its own full copy of every item. To sync, one phone's copy (a snapshot) is merged
 * into the other's, item by item (matched on id):
 *  - History (waterings, feedings, walks, groomings, rides, clean-outs, eggs, maintenance done) is combined, so if
 *    you both water a plant both waterings are kept. Entries listed in `removed` (undone on either phone)
 *    are left out.
 *  - Other fields (name, watering schedule, tags, growth stages, …) take whichever phone changed them
 *    last, going by `changed`.
 *  - Deleted items are remembered by id, so a sync never brings them back.
 * Merging is order-independent, so phones can sync in any order, any number of times, and agree.
 */

const FORMAT = 'farmhand-sync';
const VERSION = 1;

/** Item id → when it was deleted. */
export type Deleted = Record<string, string>;

export interface SyncSnapshot {
  format: typeof FORMAT;
  version: number;
  deviceId: string;
  sentAt: string;
  /** False when photos were left out (e.g. through Home Assistant); the receiver then keeps its own. */
  includesPhotos: boolean;
  items: TrackedItem[];
  deleted: Deleted;
}

/** Fields merged by combining entries rather than by "newest wins", with the prefix used in `removed`. */
const LOGS = { waterings: 'water', done: 'done' } as const;
/** Animal care history, merged like eggs: entries are matched on their date. */
const CARE_LOGS = { feedings: 'feed', walks: 'walk', groomings: 'groom', rides: 'ride', cleanings: 'clean' } as const;
const NOT_FIELDS = new Set([
  'id',
  'kind',
  'createdAt',
  'changed',
  'removed',
  'eggs',
  'photos',
  ...Object.keys(LOGS),
  ...Object.keys(CARE_LOGS),
]);

export const removedKey = {
  log: (field: keyof typeof LOGS | keyof typeof CARE_LOGS, date: string) =>
    `${{ ...LOGS, ...CARE_LOGS }[field]}:${date}`,
  egg: (date: string) => `egg:${date}`,
  photo: (id: string) => `photo:${id}`,
};

/** Records that fields were changed now, so this phone's values win the next sync. */
export function stamp<T extends TrackedItem>(item: T, ...fields: string[]): T {
  const now = new Date().toISOString();
  const changed = { ...item.changed };
  for (const f of fields) changed[f] = now;
  return { ...item, changed };
}

/** Records that a history entry or photo was removed, so syncing doesn't bring it back. */
export function markRemoved<T extends TrackedItem>(item: T, key: string): T {
  return { ...item, removed: [...(item.removed ?? []), key] };
}

const later = (a: string, b: string) => (a > b ? a : b);
const fieldTime = (item: TrackedItem, field: string) => item.changed?.[field] ?? item.createdAt;
const byNewest = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

/** Merges two copies of the same item. With `photos` false, `b`'s photos are ignored (but its removals still apply). */
export function mergeItem<T extends TrackedItem>(a: T, b: T, photos: boolean): T {
  if (a.kind !== b.kind) return a;
  const removed = [...new Set([...(a.removed ?? []), ...(b.removed ?? [])])].sort();
  const gone = new Set(removed);
  const out: Record<string, unknown> = { ...a };
  const changed: Record<string, string> = {};
  const ra = a as unknown as Record<string, unknown>;
  const rb = b as unknown as Record<string, unknown>;

  // Plain fields: the most recent change wins. Ties (e.g. never changed) pick the same side on both phones.
  for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (NOT_FIELDS.has(f)) continue;
    const ta = fieldTime(a, f);
    const tb = fieldTime(b, f);
    if (tb > ta || (tb === ta && String(JSON.stringify(rb[f])) > String(JSON.stringify(ra[f])))) out[f] = rb[f];
  }
  for (const [k, t] of [...Object.entries(a.changed ?? {}), ...Object.entries(b.changed ?? {})]) {
    changed[k] = changed[k] ? later(changed[k], t) : t;
  }

  // History: everything either phone logged, minus what was undone.
  for (const [field, prefix] of Object.entries(LOGS)) {
    if (!(field in a)) continue;
    const all = [...((ra[field] as string[]) ?? []), ...((rb[field] as string[]) ?? [])];
    out[field] = [...new Set(all)].filter((d) => !gone.has(`${prefix}:${d}`)).sort(byNewest);
  }
  if (a.kind === 'animal' && b.kind === 'animal') {
    for (const [field, prefix] of Object.entries(CARE_LOGS) as [keyof typeof CARE_LOGS, string][]) {
      const logs = new Map<string, CareLog>();
      for (const l of [...(a[field] ?? []), ...(b[field] ?? [])]) if (!logs.has(l.date)) logs.set(l.date, l);
      out[field] = [...logs.values()]
        .filter((l) => !gone.has(`${prefix}:${l.date}`))
        .sort((x, y) => byNewest(x.date, y.date));
    }
    const eggs = new Map<string, EggLog>();
    for (const e of [...a.eggs, ...b.eggs]) if (!eggs.has(e.date)) eggs.set(e.date, e);
    out.eggs = [...eggs.values()].filter((e) => !gone.has(removedKey.egg(e.date))).sort((x, y) => byNewest(x.date, y.date));
  }
  if (hasPhotos(a) && hasPhotos(b)) {
    // Animals from before photos were added to them have none.
    const aPhotos = a.photos ?? [];
    const bPhotos = b.photos ?? [];
    const mine = new Map(aPhotos.map((p) => [p.id, p]));
    const merged: PlantPhoto[] = [];
    for (const p of aPhotos) {
      const theirs = photos ? bPhotos.find((q) => q.id === p.id) : undefined;
      const key = removedKey.photo(p.id);
      // Keep our own file, but take their date if they re-dated it more recently.
      const takenAt = theirs && (b.changed?.[key] ?? '') > (a.changed?.[key] ?? '') ? theirs.takenAt : p.takenAt;
      merged.push({ ...p, takenAt });
    }
    if (photos) for (const p of bPhotos) if (!mine.has(p.id)) merged.push(p);
    out.photos = merged.filter((p) => !gone.has(removedKey.photo(p.id))).sort((x, y) => byNewest(x.takenAt, y.takenAt));
  }

  out.changed = Object.keys(changed).length ? changed : undefined;
  out.removed = removed.length ? removed : undefined;
  if (out.changed === undefined) delete out.changed;
  if (out.removed === undefined) delete out.removed;
  return out as unknown as T;
}

export interface MergeResult {
  items: TrackedItem[];
  deleted: Deleted;
  /** What changed on this phone. */
  added: number;
  updated: number;
  removed: number;
}

/** Merges another phone's snapshot into ours. Returns our own arrays untouched when nothing changed. */
export function mergeSnapshot(
  items: TrackedItem[],
  deleted: Deleted,
  remote: Pick<SyncSnapshot, 'items' | 'deleted' | 'includesPhotos'>,
): MergeResult {
  const allDeleted: Deleted = { ...deleted };
  for (const [id, at] of Object.entries(remote.deleted)) allDeleted[id] = allDeleted[id] ? later(allDeleted[id], at) : at;

  const theirs = new Map(remote.items.map((i) => [i.id, i]));
  const ours = new Set(items.map((i) => i.id));
  let updated = 0;
  let removed = 0;
  const kept: TrackedItem[] = [];
  for (const item of items) {
    if (allDeleted[item.id]) {
      removed++;
      continue;
    }
    const other = theirs.get(item.id);
    const next = other ? mergeItem(item, other, remote.includesPhotos) : item;
    if (JSON.stringify(next) !== JSON.stringify(item)) updated++;
    kept.push(next);
  }
  const fresh = remote.items
    .filter((i) => !ours.has(i.id) && !allDeleted[i.id])
    .map((i) => (hasPhotos(i) && !remote.includesPhotos ? { ...i, photos: [] } : i))
    .sort((x, y) => byNewest(x.createdAt, y.createdAt));

  const deletedChanged = Object.keys(allDeleted).length !== Object.keys(deleted).length ||
    Object.entries(allDeleted).some(([id, at]) => deleted[id] !== at);
  const nothing = updated === 0 && removed === 0 && fresh.length === 0;
  return {
    items: nothing ? items : [...fresh, ...kept],
    deleted: deletedChanged ? allDeleted : deleted,
    added: fresh.length,
    updated,
    removed,
  };
}

export function makeSnapshot(
  deviceId: string,
  items: TrackedItem[],
  deleted: Deleted,
  includesPhotos: boolean,
): SyncSnapshot {
  return {
    format: FORMAT,
    version: VERSION,
    deviceId,
    sentAt: new Date().toISOString(),
    includesPhotos,
    items: includesPhotos ? items : items.map((i) => (hasPhotos(i) ? { ...i, photos: [] } : i)),
    deleted,
  };
}

export function isSnapshot(data: unknown): data is SyncSnapshot {
  const s = data as Partial<SyncSnapshot> | null;
  return !!s && s.format === FORMAT && Array.isArray(s.items) && typeof s.deleted === 'object' && s.deleted !== null;
}

/** Checks a snapshot from another phone, throwing a friendly message if it can't be used. */
export function checkSnapshot(data: unknown): SyncSnapshot {
  if (!isSnapshot(data)) throw new Error("That isn't a FarmHand sync file.");
  if (data.version > VERSION) {
    throw new Error('That was sent from a newer version of FarmHand – update the app and try again.');
  }
  const items = data.items.filter(
    (i) => i && typeof i.id === 'string' && typeof i.name === 'string' && ['plant', 'animal', 'task'].includes(i.kind),
  );
  return { ...data, items };
}
