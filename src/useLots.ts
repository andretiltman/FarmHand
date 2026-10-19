import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { newId } from './ids';
import { lotKey } from './lots';
import { deletePhoto, savePhoto } from './photoStorage';
import { PlantPhoto } from './types';

const STORAGE_KEY = 'farmhand.lots.v1';

/** What's kept about a lot besides the plants in it. Kept on this phone only (not synced). */
export interface LotInfo {
  /** The lot's name as last saved, for reference – plants' `lot` fields are what name a lot. */
  name: string;
  /** Photos of the lot, newest first. */
  photos: PlantPhoto[];
}

const byNewest = (a: PlantPhoto, b: PlantPhoto) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0);

/** Photos of each lot, keyed by lotKey, persisted on-device with AsyncStorage. */
export function useLots() {
  const [lots, setLots] = useState<Record<string, LotInfo>>({});
  const [loaded, setLoaded] = useState(false);
  const skipFirstSave = useRef(true);
  const lotsRef = useRef(lots);
  lotsRef.current = lots;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setLots(JSON.parse(raw) as Record<string, LotInfo>);
      })
      .catch((e) => console.warn('Failed to load lots', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lots)).catch((e) => console.warn('Failed to save lots', e));
  }, [lots, loaded]);

  const update = useCallback(
    (lot: string, change: (info: LotInfo) => LotInfo) =>
      setLots((prev) => ({ ...prev, [lotKey(lot)]: change(prev[lotKey(lot)] ?? { name: lot, photos: [] }) })),
    [],
  );

  const photosOf = useCallback((lot: string): PlantPhoto[] => lots[lotKey(lot)]?.photos ?? [], [lots]);

  const addLotPhoto = useCallback(
    async (lot: string, pickedUri: string) => {
      const photoId = newId();
      const uri = await savePhoto(pickedUri, photoId);
      const now = new Date().toISOString();
      update(lot, (l) => ({ ...l, photos: [{ id: photoId, uri, takenAt: now, addedAt: now }, ...l.photos] }));
    },
    [update],
  );

  const setLotPhotoDate = useCallback(
    (lot: string, photoId: string, takenAt: string) =>
      update(lot, (l) => ({
        ...l,
        photos: l.photos.map((ph) => (ph.id === photoId ? { ...ph, takenAt } : ph)).sort(byNewest),
      })),
    [update],
  );

  const removeLotPhoto = useCallback(
    (lot: string, photoId: string) => {
      const photo = lotsRef.current[lotKey(lot)]?.photos.find((ph) => ph.id === photoId);
      if (photo) deletePhoto(photo.uri);
      update(lot, (l) => ({ ...l, photos: l.photos.filter((ph) => ph.id !== photoId) }));
    },
    [update],
  );

  /** Moves a lot's photos to its new name, joining them with the photos of a lot already called that. */
  const renameLotInfo = useCallback((from: string, to: string) => {
    setLots((prev) => {
      const old = prev[lotKey(from)];
      if (!old) return prev;
      const { [lotKey(from)]: _moved, ...rest } = prev;
      const target = rest[lotKey(to)];
      return { ...rest, [lotKey(to)]: { name: to, photos: [...old.photos, ...(target?.photos ?? [])].sort(byNewest) } };
    });
  }, []);

  return { photosOf, addLotPhoto, setLotPhotoDate, removeLotPhoto, renameLotInfo };
}
