import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { authAPI } from '../api/auth.api';

function normalizePhone(phone) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  if (d.length === 9) return `+998${d}`;
  return phone.trim();
}

function enrichUser(u) {
  if (!u) return null;
  const name = u.full_name || u.name || 'Foydalanuvchi';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : String(name).slice(0, 2).toUpperCase();
  return {
    ...u,
    name,
    initials,
    position: u.position || '',
    department: u.department || '',
    building: u.building || u.building_name || 'Asosiy bino',
    attendance: u.attendance ?? 0,
    workDays: u.work_days || u.workDays || '—',
    email: u.email || '',
    phone_work: u.phone_work || u.phone || '',
    startTime: u.start_time || u.startTime || '08:30',
    endTime: u.end_time || u.endTime || '16:30',
    messages: u.messages || [],
    reports: u.reports || {
      thisMonth: { workDays: 0, present: 0, absent: 0, late: 0, totalHours: '0s', avgPerDay: '0:00' },
      monthly: [],
    },
  };
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isBiometricEnabled: false,
  isFirstTime: true,

  clearError: () => set({ error: null }),

  checkBiometricAvailable: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  enableBiometric: async () => {
    await AsyncStorage.setItem('biu_biometric_enabled', 'true');
    set({ isBiometricEnabled: true });
  },

  disableBiometric: async () => {
    await AsyncStorage.removeItem('biu_biometric_enabled');
    set({ isBiometricEnabled: false });
  },

  authenticateWithBiometric: async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'BIU Smart ga kirish',
      promptSubtitle: 'Barmoq izi yoki yuz bilan tasdiqlang',
      cancelLabel: 'Bekor qilish',
      fallbackLabel: 'Parol bilan kirish',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw { message: 'Biometrik tasdiqlanmadi' };
    }

    const userStr = await AsyncStorage.getItem('biu_user');
    const tokenStr = await AsyncStorage.getItem('biu_token');
    if (!userStr || !tokenStr) {
      throw { message: 'Sessiya topilmadi' };
    }

    const user = enrichUser(JSON.parse(userStr));
    const token = tokenStr;
    set({ user, token, isFirstTime: false });
    return user;
  },

  login: async (phone, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authAPI.login(normalizePhone(phone), password);
      const enriched = enrichUser(user);
      await AsyncStorage.multiSet([
        ['biu_token', token],
        ['biu_user', JSON.stringify(enriched)],
      ]);
      set({ user: enriched, token, isLoading: false, isFirstTime: false });

      const bioAvailable = await get().checkBiometricAvailable();
      if (bioAvailable) {
        await get().enableBiometric();
      }
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato yuz berdi';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  biometricLogin: async (userId, bioKey) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authAPI.biometricLogin(userId, bioKey);
      const enriched = enrichUser(user);
      await AsyncStorage.multiSet([
        ['biu_token', token],
        ['biu_user', JSON.stringify(enriched)],
      ]);
      set({ user: enriched, token, isLoading: false, isFirstTime: false });
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato yuz berdi';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    const { token } = get();
    set({ isLoading: true, error: null });
    try {
      if (token) await authAPI.logout();
    } catch {
      /* ignore */
    } finally {
      await AsyncStorage.multiRemove(['biu_token', 'biu_user', 'biu_biometric_enabled']);
      set({
        user: null,
        token: null,
        isLoading: false,
        isBiometricEnabled: false,
        isFirstTime: true,
      });
    }
  },

  /** API dan kelgan maydonlarni mavjud sessiya bilan birlashtiradi va AsyncStorage ga yozadi. */
  mergeUser: async (partial) => {
    const prev = get().user;
    const merged = enrichUser({ ...(prev || {}), ...partial });
    await AsyncStorage.setItem('biu_user', JSON.stringify(merged));
    set({ user: merged });
    return merged;
  },

  restoreSession: async () => {
    try {
      const [[, token], [, rawUser], [, bioStr]] = await AsyncStorage.multiGet([
        'biu_token',
        'biu_user',
        'biu_biometric_enabled',
      ]);
      if (!token || !rawUser) {
        return { restored: false, biometricEnabled: false };
      }
      const user = enrichUser(JSON.parse(rawUser));
      const isBiometricEnabled = bioStr === 'true';
      set({
        user,
        token,
        isBiometricEnabled,
        isFirstTime: false,
      });
      return { restored: true, biometricEnabled: isBiometricEnabled };
    } catch {
      return { restored: false, biometricEnabled: false };
    }
  },
}));
