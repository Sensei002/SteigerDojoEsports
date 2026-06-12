import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToNotifications,
  markAsRead,
  markAllRead,
} from '@/services/notificationService';
import type { Notification } from '@/types';

/** Real-time notifications for the signed-in user. */
export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead: () => (user ? markAllRead(user.uid) : Promise.resolve()),
  };
};
