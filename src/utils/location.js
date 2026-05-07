import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const TASK = 'BIU_GPS_PING';
const INTERVAL = 30000;
const OFFLINE_QUEUE_KEY = '@offline_events';

// ─── Offline Queue Helpers ────────────────────────────────────────────────────

export async function getOfflineQueue() {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function pushOfflineEvent(event) {
  try {
    const queue = await getOfflineQueue();
    queue.push(event);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* storage failure — event lost, acceptable tradeoff */
  }
}

export async function clearOfflineQueue() {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch { /* */ }
}

// ─── Auto-Sync: flush offline queue when connectivity restores ────────────────

let _syncListenerActive = false;

export function startOfflineSync() {
  if (_syncListenerActive) return;
  _syncListenerActive = true;

  NetInfo.addEventListener(async (state) => {
    if (!state.isConnected) return;

    const queue = await getOfflineQueue();
    if (!queue.length) return;

    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/work/sync-offline', { events: queue });
      await clearOfflineQueue();
    } catch {
      /* Retry will happen on the next connectivity event */
    }
  });
}

// ─── Background GPS Task (module level; must register before UI) ──────────────

if (Platform.OS !== 'web') {
  TaskManager.defineTask(TASK, async ({ data, error }) => {
    if (error || !data?.locations?.[0]) return;

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    if (nowMins < 450 || nowMins > 1050) return;

    const { latitude, longitude, accuracy } = data.locations[0].coords;

    try {
      const AsyncStorageMod = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorageMod.getItem('biu_token');
      if (!token) return;

      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

      await fetch(`${BASE_URL}/api/work/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'cloudflare-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ lat: latitude, lon: longitude, accuracy }),
      });
    } catch {
      /* silent fail */
    }
  });
}

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Joylashuv ruxsati rad etildi');
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { lat: loc.coords.latitude, lon: loc.coords.longitude };
  } catch (error) {
    console.log('getCurrentLocation error:', error);
    return null;
  }
}

export function watchLocation(callback, interval = 30000) {
  let sub = null;
  let tick = null;
  let cancelled = false;

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted' || cancelled) return;
    if (Platform.OS === 'web') {
      const poll = async () => {
        if (cancelled) return;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          callback({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        } catch { /* */ }
      };
      poll();
      tick = setInterval(poll, interval);
      return;
    }
    sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: interval,
        distanceInterval: 10,
      },
      (loc) => {
        callback({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      },
    );
  })();

  return () => {
    cancelled = true;
    if (tick) clearInterval(tick);
    try {
      sub?.remove?.();
    } catch { /* veb: remove ichki xato */ }
  };
}

export async function startSilentTracking() {
  if (Platform.OS === 'web') return false;
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') return false;

    await Location.requestBackgroundPermissionsAsync();

    const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false);
    if (isRunning) return true;

    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 20,
      deferredUpdatesInterval: 30000,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'BIU Smart',
        notificationBody: 'Ish vaqti kuzatilmoqda',
        notificationColor: '#028090',
      },
    });

    console.log('Background GPS tracking started ✅');
    return true;
  } catch (e) {
    console.log('Background tracking failed:', e.message);
    return startForegroundFallback();
  }
}

let _interval = null;

export async function startForegroundFallback() {
  if (_interval) return true;

  const ping = async () => {
    try {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (nowMins < 450 || nowMins > 1050) return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const AsyncStorageMod = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorageMod.getItem('biu_token');
      if (!token) return;

      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${BASE_URL}/api/work/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'cloudflare-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        }),
      });
    } catch {
      /* silent */
    }
  };

  ping();
  _interval = setInterval(ping, INTERVAL);
  return true;
}

export async function stopSilentTracking() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
  if (Platform.OS === 'web') return;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK);
    if (running) await Location.stopLocationUpdatesAsync(TASK);
  } catch {
    /* silent */
  }
}
