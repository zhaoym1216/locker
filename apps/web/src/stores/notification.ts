import { create } from 'zustand';
import { notificationApi } from '@/lib/api';

interface NotificationState {
  unreadCount: number;
  lastFetchedAt: number;
  setUnreadCount: (n: number) => void;
  decrement: (by?: number) => void;
  clear: () => void;
  refresh: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  lastFetchedAt: 0,

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),

  decrement: (by = 1) =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - by) })),

  clear: () => set({ unreadCount: 0 }),

  refresh: async () => {
    try {
      const res: any = await notificationApi.list();
      set({ unreadCount: res.unreadCount || 0, lastFetchedAt: Date.now() });
    } catch {}
  },
}));
