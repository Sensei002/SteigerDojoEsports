import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Notification, NotificationType } from '@/types';

const NOTIFICATIONS = 'notifications';

export const pushNotification = (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) =>
  addDoc(collection(db, NOTIFICATIONS), {
    userId,
    type,
    title,
    message,
    link: link ?? null,
    read: false,
    createdAt: serverTimestamp(),
  });

/** Broadcast an admin announcement to many users. */
export const broadcast = async (
  userIds: string[],
  title: string,
  message: string,
  link?: string
): Promise<void> => {
  const batch = writeBatch(db);
  userIds.forEach((userId) => {
    const ref = doc(collection(db, NOTIFICATIONS));
    batch.set(ref, {
      userId,
      type: 'announcement',
      title,
      message,
      link: link ?? null,
      read: false,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
};

export const subscribeToNotifications = (
  userId: string,
  cb: (n: Notification[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    fbLimit(30)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)))
  );
};

export const markAsRead = (id: string) =>
  updateDoc(doc(db, NOTIFICATIONS, id), { read: true });

export const markAllRead = async (userId: string): Promise<void> => {
  const snap = await getDocs(
    query(collection(db, NOTIFICATIONS), where('userId', '==', userId), where('read', '==', false))
  );
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
};
