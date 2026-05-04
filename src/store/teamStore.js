import { create } from 'zustand';
import { staffAPI } from '../api/staff.api';

export const useTeamStore = create((set) => ({
  team: [],
  isLoading: false,
  error: null,

  fetchTeamStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await staffAPI.getTeamStatus();
      set({ team: data?.team ?? [], isLoading: false });
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || 'Xato';
      set({ error: msg, team: [], isLoading: false });
    }
  },
}));
