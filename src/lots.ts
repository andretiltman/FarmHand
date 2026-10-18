import { PlantItem, TrackedItem } from './types';

/** Where seedlings started in a seed tray grow until they're transplanted to a lot. */
export const GREENHOUSE = 'Greenhouse';

/** Lot names match whatever their case or spacing, so "north field" and "North Field " are the same lot. */
export const lotKey = (lot: string) => lot.trim().toLowerCase();

export const sameLot = (a: string | undefined, b: string | undefined) => !!a && !!b && lotKey(a) === lotKey(b);

/** The lot a plant is in now: the greenhouse while a tray-sown crop waits to be transplanted, else its lot (if any). */
export function lotOf(plant: PlantItem): string | undefined {
  const g = plant.growth;
  if (g?.method === 'transplant' && !g.transplantedAt) return GREENHOUSE;
  return plant.lot?.trim() || undefined;
}

export const lotEmoji = (lot: string) => (sameLot(lot, GREENHOUSE) ? '🏡' : '📍');

/** Every lot in use (including lots of harvested crops, so they can be planted again), greenhouse first, then A–Z. */
export function lotNames(items: TrackedItem[]): string[] {
  const names = new Map<string, string>([[lotKey(GREENHOUSE), GREENHOUSE]]);
  for (const i of items) {
    if (i.kind !== 'plant') continue;
    for (const lot of [lotOf(i), i.lot?.trim()]) if (lot && !names.has(lotKey(lot))) names.set(lotKey(lot), lot);
  }
  const [greenhouse, ...rest] = [...names.values()];
  return [greenhouse, ...rest.sort((a, b) => a.localeCompare(b))];
}

/** The plants growing in a lot right now – harvested crops are left out, as they're no longer watered or fed. */
export function plantsInLot(items: TrackedItem[], lot: string): PlantItem[] {
  return items.filter((i): i is PlantItem => i.kind === 'plant' && !i.growth?.harvestedAt && sameLot(lotOf(i), lot));
}

export interface LotGroup<T> {
  /** Null for plants that aren't in a lot. */
  lot: string | null;
  items: T[];
}

/**
 * Splits a list into a group per lot (greenhouse first, then A–Z, then plants without a lot), followed by
 * whatever isn't a plant. Returns null when no plant in the list is in a lot, so the list is shown as is.
 */
export function groupByLot(list: TrackedItem[]): { groups: LotGroup<PlantItem>[]; others: TrackedItem[] } | null {
  const plants = list.filter((i): i is PlantItem => i.kind === 'plant');
  if (!plants.some(lotOf)) return null;
  const groups = new Map<string, LotGroup<PlantItem>>();
  const loose: PlantItem[] = [];
  for (const p of plants) {
    const lot = lotOf(p);
    if (!lot) {
      loose.push(p);
      continue;
    }
    const group = groups.get(lotKey(lot)) ?? { lot, items: [] };
    group.items.push(p);
    groups.set(lotKey(lot), group);
  }
  const sorted = [...groups.values()].sort((a, b) =>
    sameLot(a.lot!, GREENHOUSE) ? -1 : sameLot(b.lot!, GREENHOUSE) ? 1 : a.lot!.localeCompare(b.lot!),
  );
  if (loose.length) sorted.push({ lot: null, items: loose });
  return { groups: sorted, others: list.filter((i) => i.kind !== 'plant') };
}
