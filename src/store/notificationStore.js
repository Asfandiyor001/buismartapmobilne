import { create } from 'zustand';
import { notificationAPI } from '../api/notification.api';

function formatNotifTime(createdAt) {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Hozir';
    if (mins < 60) return `${mins} daqiqa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} soat`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} kun`;
    return d.toLocaleDateString('uz-UZ');
  } catch {
    return '';
  }
}

function mapRow(n) {
  return {
    id: n.id,
    type: n.type || 'jadval',
    title: n.title || '',
    body: n.body || '',
    time: formatNotifTime(n.created_at),
    createdAt: n.created_at,
    unread: !n.is_read,
    raw: n,
  };
}

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isRefreshing: false,

  fetchNotifications: async (opts = {}) => {
    const silent = opts.silent === true;
    if (silent) set({ isRefreshing: true });
    else set({ isLoading: true });
    try {
      const data = await notificationAPI.getAll(100, 0);
      const list = data?.notifications ?? [];
      const unique = Array.from(new Map(list.map((n) => [n.id, n])).values());
      set({
        notifications: unique.map(mapRow),
        unreadCount: data?.unreadCount ?? 0,
        isLoading: false,
        isRefreshing: false,
      });
    } catch {
      set({ isLoading: false, isRefreshing: false });
    }
  },

  /** Darhol UI yangilanadi, so‘rov fonida; xato bo‘lsa qaytariladi */
  markRead: async (id) => {
    const prev = {
      notifications: get().notifications,
      unreadCount: get().unreadCount,
    };
    const wasUnread = prev.notifications.find((n) => n.id === id)?.unread;
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id
          ? {
              ...n,
              unread: false,
              raw: n.raw ? { ...n.raw, is_read: true } : n.raw,
            }
          : n,
      ),
      unreadCount: wasUnread
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
    try {
      await notificationAPI.markRead(id);
    } catch {
      set({
        notifications: prev.notifications,
        unreadCount: prev.unreadCount,
      });
    }
  },

  markAllRead: async () => {
    const prev = {
      notifications: get().notifications,
      unreadCount: get().unreadCount,
    };
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        unread: false,
        raw: n.raw ? { ...n.raw, is_read: true } : n.raw,
      })),
      unreadCount: 0,
    }));
    try {
      await notificationAPI.markAllRead();
    } catch {
      set({
        notifications: prev.notifications,
        unreadCount: prev.unreadCount,
      });
    }
  },

  deleteNotification: async (id) => {
    await notificationAPI.delete(id);
    const wasUnread = get().notifications.find((n) => n.id === id)?.unread;
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));
  },
}));
