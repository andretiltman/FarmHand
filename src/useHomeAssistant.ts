import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { HAConfig, normalizeUrl, pushSensors, removeSensors, testConnection } from './homeAssistant';
import { TrackedItem } from './types';

const STORAGE_KEY = 'farmhand.homeAssistant.v1';
/** Re-send now and then while the app is open, so time-based states ("due today") stay current. */
const REFRESH_MS = 15 * 60 * 1000;
/** Wait for a burst of taps to settle before syncing. */
const DEBOUNCE_MS = 1500;

interface Stored extends HAConfig {
  /** Entity ids FarmHand created last time, so deleted items can be removed from HA. */
  entities: string[];
}

export interface HAStatus {
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
}

/** Keeps Home Assistant sensors in step with the tracked items while the app is open. */
export function useHomeAssistant(items: TrackedItem[], itemsLoaded: boolean) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<HAStatus>({ syncing: false, lastSync: null, error: null });

  // Refs so the sync loop always sees the latest values without restarting timers.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setStored(JSON.parse(raw) as Stored))
      .catch((e) => console.warn('Failed to load Home Assistant settings', e))
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((next: Stored | null) => {
    setStored(next);
    storedRef.current = next;
    const write = next ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)) : AsyncStorage.removeItem(STORAGE_KEY);
    write.catch((e) => console.warn('Failed to save Home Assistant settings', e));
  }, []);

  const sync = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        const config = storedRef.current;
        if (!config) break;
        setStatus((s) => ({ ...s, syncing: true }));
        try {
          const entities = await pushSensors(config, itemsRef.current, config.entities);
          if (storedRef.current === config) save({ ...config, entities });
          setStatus({ syncing: false, lastSync: new Date().toISOString(), error: null });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          setStatus((s) => ({ ...s, syncing: false, error: message }));
        }
      } while (again.current);
    } finally {
      running.current = false;
    }
  }, [save]);

  const connected = !!stored;

  // Sync shortly after any change to the items.
  useEffect(() => {
    if (!loaded || !itemsLoaded || !connected) return;
    const t = setTimeout(sync, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [items, loaded, itemsLoaded, connected, sync]);

  // And periodically, and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!loaded || !itemsLoaded || !connected) return;
    const timer = setInterval(sync, REFRESH_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [loaded, itemsLoaded, connected, sync]);

  /** Tests the connection, then saves it and sends everything. Throws if HA can't be reached. */
  const connect = useCallback(
    async (input: HAConfig) => {
      const config = { url: normalizeUrl(input.url), token: input.token.trim() };
      await testConnection(config);
      save({ ...config, entities: storedRef.current?.entities ?? [] });
      await sync();
    },
    [save, sync],
  );

  /** Removes FarmHand's sensors from HA (best effort) and forgets the connection. */
  const disconnect = useCallback(async () => {
    const config = storedRef.current;
    save(null);
    setStatus({ syncing: false, lastSync: null, error: null });
    if (config) await removeSensors(config, config.entities);
  }, [save]);

  return { config: stored as HAConfig | null, status, connect, disconnect, syncNow: sync };
}
