import AsyncStorage from '@react-native-async-storage/async-storage';
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getDeviceId } from './device';
import {
  HAConfig,
  normalizeUrl,
  pullSnapshots,
  pushSensors,
  pushSnapshot,
  removeSensors,
  syncEntityId,
  testConnection,
} from './homeAssistant';
import { Deleted, makeSnapshot, MergeResult, SyncSnapshot } from './sync';
import { TrackedItem } from './types';

const STORAGE_KEY = 'farmhand.homeAssistant.v1';
/** Re-send now and then while the app is open, so time-based states ("due today") stay current. */
const REFRESH_MS = 15 * 60 * 1000;
/** How often to look for changes from other phones while the app is open (when syncing is on). */
const PULL_MS = 60 * 1000;
/** Wait for a burst of taps to settle before syncing. */
const DEBOUNCE_MS = 1500;

interface Stored extends HAConfig {
  /** Entity ids FarmHand created last time, so deleted items can be removed from HA. */
  entities: string[];
  /** Keep items in sync with other phones connected to the same Home Assistant. */
  share?: boolean;
}

export interface HAStatus {
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
  /** Other phones syncing through Home Assistant, and when each last sent its changes. */
  peers: { deviceId: string; sentAt: string }[];
}

/** What the hook needs from the item store to keep phones in sync. */
export interface SharedItems {
  itemsRef: MutableRefObject<TrackedItem[]>;
  deletedRef: MutableRefObject<Deleted>;
  applySnapshot: (snapshot: SyncSnapshot) => Promise<MergeResult>;
}

const IDLE: HAStatus = { syncing: false, lastSync: null, error: null, peers: [] };

/**
 * Keeps Home Assistant sensors in step with the tracked items while the app is open, and – when
 * sharing is on – merges in changes from other phones connected to the same Home Assistant.
 */
export function useHomeAssistant(items: TrackedItem[], itemsLoaded: boolean, shared: SharedItems) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<HAStatus>(IDLE);

  // Refs so the sync loop always sees the latest values without restarting timers.
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const sharedRef = useRef(shared);
  sharedRef.current = shared;
  const running = useRef(false);
  const again = useRef<'pull' | 'full' | null>(null);
  /** The last snapshot sent, to skip sending the same thing again. */
  const lastPushed = useRef('');

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

  /** Merges other phones' changes in, then (unless `pullOnly`) sends the sensors and this phone's copy. */
  const run = useCallback(
    async (mode: 'pull' | 'full') => {
      if (running.current) {
        if (again.current !== 'full') again.current = mode;
        return;
      }
      running.current = true;
      try {
        let next: 'pull' | 'full' | null = mode;
        while (next) {
          const pullOnly = next === 'pull';
          again.current = null;
          const config = storedRef.current;
          if (!config || (pullOnly && !config.share)) break;
          setStatus((s) => ({ ...s, syncing: true }));
          try {
            let peers: HAStatus['peers'] | undefined;
            if (config.share) {
              const deviceId = await getDeviceId();
              const snapshots = await pullSnapshots(config, deviceId);
              for (const snapshot of snapshots) await sharedRef.current.applySnapshot(snapshot);
              peers = snapshots.map((s) => ({ deviceId: s.deviceId, sentAt: s.sentAt }));
              if (!pullOnly) {
                const { itemsRef, deletedRef } = sharedRef.current;
                const snapshot = makeSnapshot(deviceId, itemsRef.current, deletedRef.current, false);
                const key = JSON.stringify([snapshot.items, snapshot.deleted]);
                if (key !== lastPushed.current) {
                  await pushSnapshot(config, snapshot);
                  lastPushed.current = key;
                }
              }
            }
            if (!pullOnly) {
              const entities = await pushSensors(config, sharedRef.current.itemsRef.current, config.entities);
              if (storedRef.current === config) save({ ...config, entities });
            }
            setStatus((s) => ({
              syncing: false,
              lastSync: pullOnly ? s.lastSync : new Date().toISOString(),
              error: null,
              peers: peers ?? s.peers,
            }));
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setStatus((s) => ({ ...s, syncing: false, error: message }));
          }
          next = again.current;
        }
      } finally {
        running.current = false;
      }
    },
    [save],
  );

  const sync = useCallback(() => run('full'), [run]);
  const pull = useCallback(() => run('pull'), [run]);

  const connected = !!stored;
  const sharing = !!stored?.share;

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
    const pullTimer = sharing ? setInterval(pull, PULL_MS) : undefined;
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    return () => {
      clearInterval(timer);
      if (pullTimer) clearInterval(pullTimer);
      sub.remove();
    };
  }, [loaded, itemsLoaded, connected, sharing, sync, pull]);

  /** Tests the connection, then saves it and sends everything. Throws if HA can't be reached. */
  const connect = useCallback(
    async (input: HAConfig) => {
      const config = { url: normalizeUrl(input.url), token: input.token.trim() };
      await testConnection(config);
      save({ ...config, entities: storedRef.current?.entities ?? [], share: storedRef.current?.share });
      await sync();
    },
    [save, sync],
  );

  /** Turns syncing with other phones on or off. */
  const setShare = useCallback(
    async (share: boolean) => {
      const config = storedRef.current;
      if (!config) return;
      save({ ...config, share });
      lastPushed.current = '';
      if (share) await sync();
      else {
        setStatus((s) => ({ ...s, peers: [] }));
        await removeSensors(config, [syncEntityId(await getDeviceId())]);
      }
    },
    [save, sync],
  );

  /** Removes FarmHand's sensors from HA (best effort) and forgets the connection. */
  const disconnect = useCallback(async () => {
    const config = storedRef.current;
    save(null);
    setStatus(IDLE);
    lastPushed.current = '';
    if (config) await removeSensors(config, [...config.entities, syncEntityId(await getDeviceId())]);
  }, [save]);

  return {
    config: stored as HAConfig | null,
    sharing,
    status,
    connect,
    disconnect,
    setShare,
    syncNow: sync,
  };
}
