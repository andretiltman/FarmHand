import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { newId } from './ids';
import { deletePhoto, saveDataUrlPhoto, savePhoto } from './photoStorage';
import { PlantPhoto, SeedPacket } from './types';

const STORAGE_KEY = 'farmhand.seeds.v1';

/** Crop id for seeds that aren't in the crop catalog. */
export const OTHER_SEED = 'other';

/** Seeds left on hand for a crop, across all its packets. */
export function seedsFor(packets: SeedPacket[], cropId: string): number {
  return packets.filter((p) => p.cropId === cropId).reduce((n, p) => n + p.count, 0);
}

const sameSeeds = (p: SeedPacket, cropId: string, name: string) =>
  p.cropId === cropId && p.name.toLowerCase() === name.toLowerCase();

const byNewest = (a: PlantPhoto, b: PlantPhoto) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0);

/** The seed inventory, persisted on-device with AsyncStorage. */
export function useSeeds() {
  const [packets, setPackets] = useState<SeedPacket[]>([]);
  const [loaded, setLoaded] = useState(false);
  const skipFirstSave = useRef(true);
  const packetsRef = useRef(packets);
  packetsRef.current = packets;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        // Packets saved before photos were added have none.
        if (raw) setPackets((JSON.parse(raw) as SeedPacket[]).map((p) => ({ ...p, photos: p.photos ?? [] })));
      })
      .catch((e) => console.warn('Failed to load seeds', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(packets)).catch((e) => console.warn('Failed to save seeds', e));
  }, [packets, loaded]);

  const update = useCallback(
    (id: string, change: (p: SeedPacket) => SeedPacket) =>
      setPackets((prev) => prev.map((p) => (p.id === id ? change(p) : p))),
    [],
  );

  /**
   * Adds seeds; tops up a packet with the same crop and name instead of making a duplicate.
   * Returns the id of the packet they went into.
   */
  const addSeeds = useCallback((cropId: string, name: string, count: number): string => {
    const same = packetsRef.current.find((p) => sameSeeds(p, cropId, name));
    if (same) {
      setPackets((prev) => prev.map((p) => (p.id === same.id ? { ...p, count: p.count + count } : p)));
      return same.id;
    }
    const packet: SeedPacket = { id: newId(), cropId, name, count, photos: [], addedAt: new Date().toISOString() };
    setPackets((prev) => [packet, ...prev]);
    return packet.id;
  }, []);

  const setSeedCount = useCallback((id: string, count: number) => update(id, (p) => ({ ...p, count })), [update]);

  /** Takes sown or given-away seeds out of a packet (never below zero). */
  const takeSeeds = useCallback(
    (id: string, taken: number) => update(id, (p) => ({ ...p, count: Math.max(0, p.count - taken) })),
    [update],
  );

  const removePacket = useCallback((id: string) => {
    for (const photo of packetsRef.current.find((p) => p.id === id)?.photos ?? []) deletePhoto(photo.uri);
    setPackets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addSeedPhoto = useCallback(
    async (id: string, pickedUri: string) => {
      const photoId = newId();
      const uri = await savePhoto(pickedUri, photoId);
      const now = new Date().toISOString();
      update(id, (p) => ({ ...p, photos: [{ id: photoId, uri, takenAt: now, addedAt: now }, ...p.photos] }));
    },
    [update],
  );

  const setSeedPhotoDate = useCallback(
    (id: string, photoId: string, takenAt: string) =>
      update(id, (p) => ({
        ...p,
        photos: p.photos.map((ph) => (ph.id === photoId ? { ...ph, takenAt } : ph)).sort(byNewest),
      })),
    [update],
  );

  const removeSeedPhoto = useCallback(
    (id: string, photoId: string) => {
      const photo = packetsRef.current.find((p) => p.id === id)?.photos.find((ph) => ph.id === photoId);
      if (photo) deletePhoto(photo.uri);
      update(id, (p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== photoId) }));
    },
    [update],
  );

  /** Adds seeds someone sent (photos as data: URLs), topping up packets of the same seeds. */
  const importSeeds = useCallback(async (received: SeedPacket[]) => {
    const incoming: SeedPacket[] = [];
    for (const packet of received) {
      const photos: PlantPhoto[] = [];
      for (const photo of packet.photos) {
        const photoId = newId();
        try {
          photos.push({ ...photo, id: photoId, uri: await saveDataUrlPhoto(photo.uri, photoId) });
        } catch (e) {
          console.warn('Skipping a photo that could not be saved', e);
        }
      }
      incoming.push({ ...packet, photos });
    }
    setPackets((prev) => {
      let next = prev;
      for (const packet of incoming) {
        const same = next.find((p) => sameSeeds(p, packet.cropId, packet.name));
        next = same
          ? next.map((p) =>
              p === same ? { ...p, count: p.count + packet.count, photos: [...packet.photos, ...p.photos].sort(byNewest) } : p,
            )
          : [{ ...packet, id: newId(), addedAt: new Date().toISOString() }, ...next];
      }
      return next;
    });
  }, []);

  return {
    packets,
    addSeeds,
    setSeedCount,
    takeSeeds,
    removePacket,
    addSeedPhoto,
    setSeedPhotoDate,
    removeSeedPhoto,
    importSeeds,
  };
}
