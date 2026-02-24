'use client';

import { create } from 'zustand';
import api from '@/lib/api';

interface Notification {
  id: string;
  titleAr: string;
  messageAr: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => void;
  setNotifications: (list: Notification[]) => void;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  setNotifications: (list) =>
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.isRead).length,
    }),

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications');
      set({
        notifications: data,
        unreadCount: data.filter((n: Notification) => !n.isRead).length,
      });
    } catch {
      // silently fail - notifications are non-critical
    }
  },
}));
