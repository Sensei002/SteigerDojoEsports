import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { NewsArticle } from '@/types';
import { slugify } from '@/utils/helpers';

const NEWS = 'news';

export const createArticle = (
  data: Omit<NewsArticle, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
) =>
  addDoc(collection(db, NEWS), {
    ...data,
    slug: slugify(data.title),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);

export const getArticle = async (id: string): Promise<NewsArticle | null> => {
  const snap = await getDoc(doc(db, NEWS, id));
  return snap.exists() ? ({ id, ...snap.data() } as NewsArticle) : null;
};

export const updateArticle = (id: string, data: Partial<NewsArticle>) =>
  updateDoc(doc(db, NEWS, id), {
    ...data,
    ...(data.title ? { slug: slugify(data.title) } : {}),
    updatedAt: serverTimestamp(),
  });

export const deleteArticle = (id: string) => deleteDoc(doc(db, NEWS, id));

export const listArticles = async (
  opts: { publishedOnly?: boolean; category?: string; max?: number } = {}
): Promise<NewsArticle[]> => {
  const constraints = [];
  if (opts.publishedOnly) constraints.push(where('published', '==', true));
  if (opts.category) constraints.push(where('category', '==', opts.category));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(fbLimit(opts.max ?? 30));
  const snap = await getDocs(query(collection(db, NEWS), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsArticle));
};
