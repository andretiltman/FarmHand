import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CARE, CareJob } from './care';
import { StageAction } from './growth';
import { newId } from './ids';
import { deletePhoto, saveDataUrlPhoto, savePhoto } from './photoStorage';
import { Deleted, markRemoved, mergeSnapshot, MergeResult, removedKey, stamp, SyncSnapshot } from './sync';
import { TransferPlant } from './transfer';
import {
  AnimalItem,
  CareKind,
  CareLog,
  Growth,
  hasPhotos,
  NewItem,
  PhotoItem,
  PlantItem,
  PlantPhoto,
  TaskItem,
  TrackedItem,
} from './types';

const STORAGE_KEY = 'farmhand.items.v1';
/** Ids of deleted items, so syncing with another phone doesn't bring them back. */
const DELETED_KEY = 'farmhand.deleted.v1';

const careLogs = (logs: (CareLog | string)[] | undefined): CareLog[] =>
  (logs ?? []).map((l) => (typeof l === 'string' ? { date: l } : l));

/** Fills in fields added after an item was first saved. */
function migrate(item: TrackedItem): TrackedItem {
  switch (item.kind) {
    case 'animal':
      // Animals added before care jobs were tracked were all poultry: feeding and eggs.
      return {
        ...item,
        care: item.care ?? ['feed'],
        careEvery: item.careEvery ?? {},
        tracksEggs: item.tracksEggs ?? true,
        eggs: item.eggs ?? [],
        names: item.names ?? [],
        // Care used to be logged as bare timestamps.
        feedings: careLogs(item.feedings),
        walks: careLogs(item.walks),
        groomings: careLogs(item.groomings),
        rides: careLogs(item.rides),
        cleanings: careLogs(item.cleanings),
        photos: item.photos ?? [],
      };
    case 'plant':
      return { ...item, waterings: item.waterings ?? [], photos: item.photos ?? [], tags: item.tags ?? [] };
    case 'task':
      return { ...item, done: item.done ?? [] };
  }
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
  if (newest.field === 'water') {
    return markRemoved({ ...plant, waterings: plant.waterings.slice(1) }, removedKey.log('waterings', newest.date));
  }
  const growth = { ...plant.growth!, [newest.field]: undefined };
  if (newest.field === 'transplantedAt') growth.transplantedCount = undefined;
  return stamp({ ...plant, growth }, 'growth');
}

/** Removes the newest feeding, walk, grooming, ride, clean-out or egg collection from an animal. */
function undoAnimal(animal: AnimalItem): AnimalItem {
  const lastEgg = animal.eggs[0]?.date ?? '';
  let newest: { date: string; field: CareJob['field'] } | null = null;
  for (const { field } of Object.values(CARE)) {
    const date = animal[field][0]?.date;
    if (date && (!newest || date > newest.date)) newest = { date, field };
  }
  if (!lastEgg && !newest) return animal;
  if (newest && newest.date > lastEgg) {
    const { field, date } = newest;
    return markRemoved({ ...animal, [field]: animal[field].slice(1) }, removedKey.log(field, date));
  }
  return markRemoved({ ...animal, eggs: animal.eggs.slice(1) }, removedKey.egg(lastEgg));
}

function undoTask(task: TaskItem): TaskItem {
  if (!task.done[0]) return task;
  return markRemoved({ ...task, done: task.done.slice(1) }, removedKey.log('done', task.done[0]));
}

function deletePhotoFiles(before: TrackedItem[], after: TrackedItem[]) {
  const kept = new Set(after.flatMap((i) => (hasPhotos(i) ? i.photos.map((p) => p.uri) : [])));
  for (const i of before) if (hasPhotos(i)) for (const p of i.photos) if (!kept.has(p.uri)) deletePhoto(p.uri);
}

/** All tracked plants, animals and maintenance tasks, persisted on-device with AsyncStorage. */
export function useItems() {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [deleted, setDeleted] = useState<Deleted>({});
  const [loaded, setLoaded] = useState(false);
  const skipFirstSave = useRef(true);
  const skipFirstDeletedSave = useRef(true);
  // Latest values, for sync code that runs outside of renders.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const deletedRef = useRef(deleted);
  deletedRef.current = deleted;

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(DELETED_KEY)])
      .then(([raw, rawDeleted]) => {
        if (raw) setItems((JSON.parse(raw) as TrackedItem[]).map(migrate));
        if (rawDeleted) setDeleted(JSON.parse(rawDeleted) as Deleted);
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

  useEffect(() => {
    if (!loaded) return;
    if (skipFirstDeletedSave.current) {
      skipFirstDeletedSave.current = false;
      return;
    }
    AsyncStorage.setItem(DELETED_KEY, JSON.stringify(deleted)).catch((e) =>
      console.warn('Failed to save deleted items', e),
    );
  }, [deleted, loaded]);

  const update = useCallback((id: string, change: (item: TrackedItem) => TrackedItem) => {
    setItems((prev) => prev.map((i) => (i.id === id ? change(i) : i)));
  }, []);

  const updatePlant = useCallback(
    (id: string, change: (plant: PlantItem) => PlantItem) => update(id, (i) => (i.kind === 'plant' ? change(i) : i)),
    [update],
  );

  const updateAnimal = useCallback(
    (id: string, change: (animal: AnimalItem) => AnimalItem) => update(id, (i) => (i.kind === 'animal' ? change(i) : i)),
    [update],
  );

  const updatePhotos = useCallback(
    (id: string, change: (photos: PlantPhoto[], item: PhotoItem) => Partial<PhotoItem>) =>
      update(id, (i) => (hasPhotos(i) ? ({ ...i, ...change(i.photos, i) } as TrackedItem) : i)),
    [update],
  );

  const addItem = useCallback((input: NewItem) => {
    const base = { id: newId(), createdAt: new Date().toISOString() };
    const item: TrackedItem =
      input.kind === 'plant'
        ? { ...input, ...base, waterings: [], photos: [] }
        : input.kind === 'animal'
          ? { ...input, ...base, eggs: [], feedings: [], walks: [], groomings: [], rides: [], cleanings: [], photos: [] }
          : { ...input, ...base };
    setItems((prev) => [item, ...prev]);
  }, []);

  /** Deletes items, remembering their ids so syncing doesn't bring them back. */
  const removeItems = useCallback((ids: string[]) => {
    const now = new Date().toISOString();
    setDeleted((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, now])) }));
    setItems((prev) => {
      const next = prev.filter((i) => !ids.includes(i.id));
      deletePhotoFiles(prev, next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => removeItems([id]), [removeItems]);

  /** Adds plants, animals and tasks someone sent, as new entries (with their photos saved to this phone). */
  const importItems = useCallback(async (plants: TransferPlant[], others: (AnimalItem | TaskItem)[]) => {
    const added: TrackedItem[] = [];
    for (const item of [...plants, ...others]) {
      // A copy is a new item, so it starts without the sender's sync history.
      const { changed: _changed, removed: _removed, ...rest } = item;
      const copy = migrate({ ...rest, id: newId() } as TrackedItem);
      if (hasPhotos(copy)) {
        const photos: PlantPhoto[] = [];
        for (const photo of copy.photos) {
          const photoId = newId();
          try {
            const uri = await saveDataUrlPhoto(photo.uri, photoId);
            photos.push({ id: photoId, uri, takenAt: photo.takenAt, addedAt: photo.addedAt });
          } catch (e) {
            console.warn('Skipping a photo that could not be saved', e);
          }
        }
        copy.photos = photos;
      }
      added.push(copy);
    }
    setItems((prev) => [...added, ...prev]);
  }, []);

  /**
   * Merges another phone's items into ours (see sync.ts). Photos that came along as data are saved
   * first. Returns what changed.
   */
  const applySnapshot = useCallback(async (snapshot: SyncSnapshot): Promise<MergeResult> => {
    let incoming = snapshot.items.map(migrate);
    if (snapshot.includesPhotos) {
      const known = new Set(itemsRef.current.flatMap((i) => (hasPhotos(i) ? i.photos.map((p) => p.id) : [])));
      const saved: TrackedItem[] = [];
      for (const item of incoming) {
        if (!hasPhotos(item)) {
          saved.push(item);
          continue;
        }
        const photos: PlantPhoto[] = [];
        for (const p of item.photos) {
          if (known.has(p.id)) photos.push(p);
          else if (p.uri.startsWith('data:')) {
            try {
              photos.push({ ...p, uri: await saveDataUrlPhoto(p.uri, p.id) });
            } catch (e) {
              console.warn('Skipping a photo that could not be saved', e);
            }
          }
        }
        saved.push({ ...item, photos });
      }
      incoming = saved;
    }

    const remote = { ...snapshot, items: incoming };
    const base = itemsRef.current;
    const result = mergeSnapshot(base, deletedRef.current, remote);
    if (result.items !== base) {
      deletePhotoFiles(base, result.items);
      itemsRef.current = result.items;
      // If something was changed on this phone while photos were saving, merge into that instead.
      setItems((prev) => (prev === base ? result.items : mergeSnapshot(prev, result.deleted, remote).items));
    }
    if (result.deleted !== deletedRef.current) {
      deletedRef.current = result.deleted;
      setDeleted(result.deleted);
    }
    return result;
  }, []);

  const renameItem = useCallback((id: string, name: string) => update(id, (i) => stamp({ ...i, name }, 'name')), [update]);

  const setTags = useCallback(
    (id: string, tags: string[]) => updatePlant(id, (p) => stamp({ ...p, tags }, 'tags')),
    [updatePlant],
  );

  const setWaterEvery = useCallback(
    (id: string, waterEveryDays: number) => updatePlant(id, (p) => stamp({ ...p, waterEveryDays }, 'waterEveryDays')),
    [updatePlant],
  );

  /** Replaces a plant's growth record, e.g. after the user moves a milestone date. */
  const updateGrowth = useCallback(
    (id: string, growth: Growth) => updatePlant(id, (p) => stamp({ ...p, growth }, 'growth')),
    [updatePlant],
  );

  const addPhoto = useCallback(
    async (id: string, pickedUri: string) => {
      const photoId = newId();
      const uri = await savePhoto(pickedUri, photoId);
      const now = new Date().toISOString();
      const photo: PlantPhoto = { id: photoId, uri, takenAt: now, addedAt: now };
      updatePhotos(id, (photos) => ({ photos: [photo, ...photos] }));
    },
    [updatePhotos],
  );

  const setPhotoDate = useCallback(
    (id: string, photoId: string, takenAt: string) =>
      updatePhotos(id, (photos, item) =>
        stamp(
          {
            ...item,
            photos: photos
              .map((ph) => (ph.id === photoId ? { ...ph, takenAt } : ph))
              .sort((a, b) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0)),
          },
          removedKey.photo(photoId),
        ),
      ),
    [updatePhotos],
  );

  const removePhoto = useCallback(
    (id: string, photoId: string) =>
      updatePhotos(id, (photos, item) => {
        const photo = photos.find((ph) => ph.id === photoId);
        if (photo) deletePhoto(photo.uri);
        return markRemoved({ ...item, photos: photos.filter((ph) => ph.id !== photoId) }, removedKey.photo(photoId));
      }),
    [updatePhotos],
  );

  const waterPlant = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      updatePlant(id, (p) => ({ ...p, waterings: [now, ...p.waterings] }));
    },
    [updatePlant],
  );

  const completeTask = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      update(id, (i) => (i.kind === 'task' ? { ...i, done: [now, ...i.done] } : i));
    },
    [update],
  );

  const setTaskEvery = useCallback(
    (id: string, everyDays: number) =>
      update(id, (i) => (i.kind === 'task' ? stamp({ ...i, everyDays }, 'everyDays') : i)),
    [update],
  );

  const logEggs = useCallback(
    (id: string, count: number) => {
      if (count <= 0) return;
      const entry = { date: new Date().toISOString(), count };
      updateAnimal(id, (a) => ({ ...a, eggs: [entry, ...a.eggs] }));
    },
    [updateAnimal],
  );

  /** Logs a feeding, walk, grooming, ride or clean-out as of now – for `who` of the named animals, or all of them. */
  const logCare = useCallback(
    (id: string, kind: CareKind, who?: string[]) => {
      const { field } = CARE[kind];
      updateAnimal(id, (a) => {
        const log: CareLog = { date: new Date().toISOString() };
        if (who && a.names.some((n) => !who.includes(n))) log.who = who;
        return { ...a, [field]: [log, ...a[field]] };
      });
    },
    [updateAnimal],
  );

  /** Changes which jobs are tracked for an animal, and whether it lays eggs. */
  const setCare = useCallback(
    (id: string, care: CareKind[], tracksEggs: boolean) =>
      updateAnimal(id, (a) => stamp({ ...a, care, tracksEggs }, 'care', 'tracksEggs')),
    [updateAnimal],
  );

  /** Names the animals; the head count follows the number of names. */
  const setNames = useCallback(
    (id: string, names: string[]) =>
      updateAnimal(id, (a) =>
        stamp({ ...a, names, headCount: names.length || a.headCount }, 'names', 'headCount'),
      ),
    [updateAnimal],
  );

  /** Leaves fewer animals in an entry, after some were given away. */
  const keepAnimals = useCallback(
    (id: string, kept: Pick<AnimalItem, 'headCount' | 'names'>) =>
      updateAnimal(id, (a) => stamp({ ...a, ...kept }, 'names', 'headCount')),
    [updateAnimal],
  );

  const setCareEvery = useCallback(
    (id: string, kind: CareKind, days: number) =>
      updateAnimal(id, (a) => stamp({ ...a, careEvery: { ...a.careEvery, [kind]: days } }, 'careEvery')),
    [updateAnimal],
  );

  /** Confirms a growth milestone (sprouted / transplanted / harvested) as of now. */
  const advanceStage = useCallback(
    (id: string, action: StageAction) => {
      const now = new Date().toISOString();
      updatePlant(id, (p) =>
        p.growth ? stamp({ ...p, growth: { ...p.growth, [STAGE_FIELD[action]]: now } }, 'growth') : p,
      );
    },
    [updatePlant],
  );

  /** Removes the most recent history entry (undo a mis-tap). */
  const undoLast = useCallback(
    (id: string) =>
      update(id, (i) => (i.kind === 'plant' ? undoPlant(i) : i.kind === 'task' ? undoTask(i) : undoAnimal(i))),
    [update],
  );

  return {
    items,
    deleted,
    loaded,
    itemsRef,
    deletedRef,
    addItem,
    removeItem,
    removeItems,
    importItems,
    applySnapshot,
    renameItem,
    setTags,
    setWaterEvery,
    waterPlant,
    logEggs,
    logCare,
    setCare,
    setCareEvery,
    setNames,
    keepAnimals,
    completeTask,
    setTaskEvery,
    advanceStage,
    updateGrowth,
    addPhoto,
    setPhotoDate,
    removePhoto,
    undoLast,
  };
}
