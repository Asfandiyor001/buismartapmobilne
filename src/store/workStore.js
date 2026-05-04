import { create } from 'zustand';
import { workAPI } from '../api/work.api';

export const useWorkStore = create((set, get) => ({
  todaySession: null,
  activeLog: null,
  weekData: null,
  monthData: null,
  isLoading: false,
  error: null,

  fetchToday: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await workAPI.getToday();
      set({ todaySession: data, isLoading: false });
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato';
      set({ error: msg, todaySession: null, isLoading: false });
    }
  },

  fetchActiveLog: async () => {
    try {
      const data = await workAPI.getActive();
      set({ activeLog: data });
    } catch {
      set({ activeLog: null });
    }
  },

  checkIn: async (buildingId, lat, lon) => {
    set({ error: null });
    await workAPI.checkIn(buildingId, lat, lon);
    await get().fetchToday();
    await get().fetchActiveLog();
  },

  checkOut: async (lat, lon) => {
    set({ error: null });
    const result = await workAPI.checkOut(lat, lon);
    await get().fetchToday();
    set({ activeLog: null });
    return result;
  },

  fetchWeek: async (from) => {
    set({ isLoading: true, error: null });
    try {
      const data = await workAPI.getWeek(from);
      set({ weekData: data, isLoading: false });
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato';
      set({ error: msg, weekData: null, isLoading: false });
    }
  },

  fetchMonth: async (year, month) => {
    set({ isLoading: true, error: null });
    try {
      const data = await workAPI.getMonth(year, month);
      set({ monthData: data, isLoading: false });
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato';
      set({ error: msg, monthData: null, isLoading: false });
    }
  },
}));
