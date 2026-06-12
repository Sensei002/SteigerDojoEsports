import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Sponsor } from '@/types';

const SPONSORS = 'sponsors';

export const createSponsor = (data: Omit<Sponsor, 'id' | 'createdAt'>) =>
  addDoc(collection(db, SPONSORS), { ...data, createdAt: serverTimestamp() }).then(
    (ref) => ref.id
  );

export const listSponsors = async (): Promise<Sponsor[]> => {
  const snap = await getDocs(query(collection(db, SPONSORS), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sponsor));
};

export const updateSponsor = (id: string, data: Partial<Sponsor>) =>
  updateDoc(doc(db, SPONSORS, id), data);

export const deleteSponsor = (id: string) => deleteDoc(doc(db, SPONSORS, id));
