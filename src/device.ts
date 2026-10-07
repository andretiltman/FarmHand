import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY = 'farmhand.device.v1';
let cached: Promise<string> | null = null;

/** A random id for this phone (12 hex characters), made once and kept, so other phones can tell its changes apart. */
export function getDeviceId(): Promise<string> {
  cached ??= AsyncStorage.getItem(DEVICE_KEY).then(async (id) => {
    if (id) return id;
    const fresh = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await AsyncStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  });
  return cached;
}
