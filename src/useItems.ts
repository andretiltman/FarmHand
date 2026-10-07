import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { StageAction } from './growth';
import { deletePhoto, savePhoto } from './photoStorage';
import { Growth, NewItem, PlantItem, PlantPhoto, TrackedItem } from './types';

const STORAGE_KEY = 'farmhand.items.v1';

/** Fills in fields added after an item was first saved. */
function migrate(item: TrackedItem): TrackedItem {
  return item.kind === 'animal' ? { ...item, feedings: item.feedings ?? [] } : { ...item, photos: item.photos ?? [], tags: item.tags ?? [] };
}

const STAGE_FIELD: Record<StageAction, 'sproutedAt' | 'transplantedAt' | 'harvestedAt'> = {
  sprouted: 'sproutedAt',
  transplanted: 'transplantedAt',
  harvested: 'harvestedAt',
};

/** Removes the newest watering or stage change from a plant. */
function undoPlant(plant: PlantItem): PlantItem {
  let newest: { date: string; field: keyof Growth | 'water' } | null = plant.waterings[0]
    ? { date: plant.waterings[0], field: 'water' }
    : null;
  for (const field of Object.values(STAGE_FIELD)) {
    const date = plant.growth?.[field];
    if (date && (!newest || date > newest.date)) newest = { date, field };
  }
  if (!newest) return plant;
  if (newest.field === 'water') return { ...plant, waterings: plant.waterings.slice(1) };
  const growth = { ...plant.growth!, [newest.field]: undefined };
  if (newest.field === 'transplantedAt') growth.transplantedCount = undefined;
  return { ...plant, growth };
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((e) => console.warn('Failed to save items', e));
  }, [items, loaded]);

  const addItem = useCallback((input: NewItem) => {
    const base = { id: makeId(), createdAt: new Date().toISOString() };
    const item: TrackedItem =
      input.kind === 'plant'
        ? { ...input, ...base, waterings: [], photos: [] }
        : { ...input, ...base, eggs: [], feedings: [] };
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.kind === 'plant') item.photos.forEach((p) => deletePhoto(p.uri));
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const renameItem = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);

  const updatePlant = useCallback((id: string, update: (plant: PlantItem) => PlantItem) => {
    setItems((prev) => prev.map((i) => (i.id === id && i.kind === 'plant' ? update(i) : i)));
  }, []);

  const setTags = useCallback(
    (id: string, tags: string[]) => updatePlant(id, (p) => ({ ...p, tags })),
    [updatePlant],
  );

  const setWaterEvery = useCallback(
    (id: string, waterEveryDays: number) => updatePlant(id, (p) => ({ ...p, waterEveryDays })),
    [updatePlant],
  );

  /** Replaces a plant's growth record, e.g. after the user moves a milestone date. */
  const updateGrowth = useCallback(
    (id: string, growth: Growth) => updatePlant(id, (p) => ({ ...p, growth })),
    [updatePlant],
  );

  const addPhoto = useCallback(
    async (id: string, pickedUri: string) => {
      const photoId = makeId();
      const uri = await savePhoto(pickedUri, photoId);
      const photo: PlantPhoto = { id: photoId, uri, takenAt: new Date().toISOString() };
      updatePlant(id, (p) => ({ ...p, photos: [photo, ...p.photos] }));
    },
    [updatePlant],
  );

  const setPhotoDate = useCallback(
    (id: string, photoId: string, takenAt: string) =>
      updatePlant(id, (p) => ({
        ...p,
        photos: p.photos
          .map((ph) => (ph.id === photoId ? { ...ph, takenAt } : ph))
          .sort((a, b) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0)),
      })),
    [updatePlant],
  );

  const removePhoto = useCallback(
    (id: string, photoId: string) =>
      updatePlant(id, (p) => {
        const photo = p.photos.find((ph) => ph.id === photoId);
        if (photo) deletePhoto(photo.uri);
        return { ...p, photos: p.photos.filter((ph) => ph.id !== photoId) };
      }),
    [updatePlant],
  );

  const waterPlant = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.kind === 'plant' ? { ...i, waterings: [now, ...i.waterings] } : i)),
    );
  }, []);

  const logEggs = useCallback((id: string, count: number) => {
    if (count <= 0) return;
    const entry = { date: new Date().toISOString(), count };
    setItems((prev) => prev.map((i) => (i.id === id && i.kind === 'animal' ? { ...i, eggs: [entry, ...i.eggs] } : i)));
  }, []);

  const feedAnimal = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.kind === 'animal' ? { ...i, feedings: [now, ...i.feedings] } : i)),
    );
  }, []);

  /** Confirms a growth milestone (sprouted / transplanted / harvested) as of now. */
  const advanceStage = useCallback((id: string, action: StageAction) => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.kind === 'plant' && i.growth
          ? { ...i, growth: { ...i.growth, [STAGE_FIELD[action]]: now } }
          : i,
      ),
    );
  }, []);

  /** Removes the most recent history entry (undo a mis-tap). */
  const undoLast = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.kind === 'plant') return undoPlant(i);
        const lastEgg = i.eggs[0]?.date ?? '';
        const lastFeed = i.feedings[0] ?? '';
        if (!lastEgg && !lastFeed) return i;
        return lastFeed > lastEgg ? { ...i, feedings: i.feedings.slice(1) } : { ...i, eggs: i.eggs.slice(1) };
      }),
    );
  }, []);

  return {
    items,
    loaded,
    addItem,
    removeItem,
    renameItem,
    setTags,
    setWaterEvery,
    waterPlant,
    logEggs,
    feedAnimal,
    advanceStage,
    updateGrowth,
    addPhoto,
    setPhotoDate,
    removePhoto,
    undoLast,
  };
}
