import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { NewItem, TrackedItem } from './types';

const STORAGE_KEY = 'farmhand.items.v1';

/** Fills in fields added after an item was first saved. */
function migrate(item: TrackedItem): TrackedItem {
  return item.kind === 'animal' ? { ...item, feedings: item.feedings ?? [] } : item;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** All tracked plants/animals, persisted on-device with AsyncStorage. */
export function useItems() {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setItems((JSON.parse(raw) as TrackedItem[]).map(migrate));
      })
      .catch((e) => console.warn('Failed to load items', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((e) =>
      console.warn('Failed to save items', e),
    );
  }, [items, loaded]);

  const addItem = useCallback((input: NewItem) => {
    const base = { id: makeId(), createdAt: new Date().toISOString() };
    const item: TrackedItem =
      input.kind === 'plant'
        ? { ...input, ...base, waterings: [] }
        : { ...input, ...base, eggs: [], feedings: [] };
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const waterPlant = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.kind === 'plant' ? { ...i, waterings: [now, ...i.waterings] } : i)),
    );
  }, []);

  const logEggs = useCallback((id: string, count: number) => {
    if (count <= 0) return;
    const entry = { date: new Date().toISOString(), count };
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.kind === 'animal' ? { ...i, eggs: [entry, ...i.eggs] } : i)),
    );
  }, []);

  const feedAnimal = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.kind === 'animal' ? { ...i, feedings: [now, ...i.feedings] } : i)),
    );
  }, []);

  /** Removes the most recent history entry (undo a mis-tap). */
  const undoLast = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.kind === 'plant') return { ...i, waterings: i.waterings.slice(1) };
        const lastEgg = i.eggs[0]?.date ?? '';
        const lastFeed = i.feedings[0] ?? '';
        if (!lastEgg && !lastFeed) return i;
        return lastFeed > lastEgg ? { ...i, feedings: i.feedings.slice(1) } : { ...i, eggs: i.eggs.slice(1) };
      }),
    );
  }, []);

  return { items, loaded, addItem, removeItem, waterPlant, logEggs, feedAnimal, undoLast };
}
