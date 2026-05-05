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

// ─── Background GPS Task ──────────────────────────────────────────────────────

if (Platform.OS !== 'web') {
  TaskManager.defineTask(TASK, async ({ data, error }) => {
    if (error || !data?.locations?.[0]) return;

    // Only ping the server during the tracking window (07:30–17:30).
    // 30-minute buffer before/after the 08:00–16:30 work day to capture early arrivals.
    const _taskNow  = new Date();
    const _taskMins = _taskNow.getHours() * 60 + _taskNow.getMinutes();
    const TRACK_START = 7 * 60 + 30;  // 07:30
    const TRACK_END   = 17 * 60 + 30; // 17:30
    if (_taskMins < TRACK_START || _taskMins > TRACK_END) return;

    const { latitude, longitude, accuracy } = data.locations[0].coords;
    const payload = {
      type: 'ping',
      lat: latitude,
      lon: longitude,
      accuracy,
      timestamp: new Date().toISOString(),
    };

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await pushOfflineEvent(payload);
        return;
      }

      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/work/ping', { lat: latitude, lon: longitude, accuracy });
    } catch {
      // API call failed while online — queue for later sync
      await pushOfflineEvent(payload);
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

export async function startSilentTracking(apiClient) {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    await Location.requestBackgroundPermissionsAsync().catch(() => {});

    const isTaskDefined = TaskManager.isTaskDefined(TASK);

    if (isTaskDefined) {
      try {
        const running = await Location.hasStartedLocationUpdatesAsync(TASK);
        if (!running) {
          await Location.startLocationUpdatesAsync(TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 15,
            foregroundService: {
              notificationTitle: 'BIU Smart',
              notificationBody: 'Ish vaqti kuzatilmoqda',
              notificationColor: '#028090',
            },
            showsBackgroundLocationIndicator: true,
            pausesUpdatesAutomatically: false,
          });
        }
        return true;
      } catch (bgError) {
        console.log('Background tracking failed, using foreground:', bgError.message);
      }
    }

    return startForegroundTracking(apiClient);
  } catch (e) {
    console.log('Tracking error:', e.message);
    return false;
  }
}

let foregroundInterval = null;

export async function startForegroundTracking(apiClient) {
  if (foregroundInterval) return true;

  const sendPing = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = location.coords;

      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (nowMins < 450 || nowMins > 1050) return;

      await apiClient.post('/work/ping', {
        lat: latitude,
        lon: longitude,
        accuracy: accuracy || 10,
      });
    } catch {
      /* silent fail */
    }
  };

  sendPing();
  foregroundInterval = setInterval(sendPing, 30000);
  return true;
}

export async function stopSilentTracking() {
  if (foregroundInterval) {
    clearInterval(foregroundInterval);
    foregroundInterval = null;
  }

  if (Platform.OS === 'web') return;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK);
    if (running) await Location.stopLocationUpdatesAsync(TASK);
  } catch {
    /* silent */
  }
}
