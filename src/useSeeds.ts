import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { newId } from './ids';

const STORAGE_KEY = 'farmhand.seeds.v1';

/** Crop id for seeds that aren't in the crop catalog. */
export const OTHER_SEED = 'other';

/** A packet (or jar) of seeds on hand, not yet sown. */
export interface SeedPacket {
  id: string;
  /** Crop catalog id, or OTHER_SEED. */
  cropId: string;
  /** e.g. "Cherry tomato" – defaults to the crop's name. */
  name: string;
  count: number;
  addedAt: string;
}

/** Seeds left on hand for a crop, across all its packets. */
export function seedsFor(packets: SeedPacket[], cropId: string): number {
  return packets.filter((p) => p.cropId === cropId).reduce((n, p) => n + p.count, 0);
}

/** The seed inventory, persisted on-device with AsyncStorage. */
export function useSeeds() {
  const [packets, setPackets] = useState<SeedPacket[]>([]);
  const [loaded, setLoaded] = useState(false);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setPackets(JSON.parse(raw) as SeedPacket[]))
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

  /** Adds seeds; tops up a packet with the same crop and name instead of making a duplicate. */
  const addSeeds = useCallback((cropId: string, name: string, count: number) => {
    if (count <= 0) return;
    setPackets((prev) => {
      const same = prev.find((p) => p.cropId === cropId && p.name.toLowerCase() === name.toLowerCase());
      if (same) return prev.map((p) => (p === same ? { ...p, count: p.count + count } : p));
      return [{ id: newId(), cropId, name, count, addedAt: new Date().toISOString() }, ...prev];
    });
  }, []);

  const setSeedCount = useCallback(
    (id: string, count: number) => setPackets((prev) => prev.map((p) => (p.id === id ? { ...p, count } : p))),
    [],
  );

  /** Takes sown seeds out of a packet (never below zero). */
  const takeSeeds = useCallback(
    (id: string, sown: number) =>
      setPackets((prev) => prev.map((p) => (p.id === id ? { ...p, count: Math.max(0, p.count - sown) } : p))),
    [],
  );

  const removePacket = useCallback((id: string) => setPackets((prev) => prev.filter((p) => p.id !== id)), []);

  return { packets, addSeeds, setSeedCount, takeSeeds, removePacket };
}
