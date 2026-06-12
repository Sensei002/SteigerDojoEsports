import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '@/firebase/config';
import { createUserProfile, getUser, isUsernameTaken } from './userService';
import { slugify } from '@/utils/helpers';

export const registerWithEmail = async (
  email: string,
  password: string,
  username: string
): Promise<FirebaseUser> => {
  if (await isUsernameTaken(username)) {
    throw { code: 'app/username-taken', message: 'That username is already taken.' };
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: username });
  await createUserProfile(cred.user.uid, {
    email,
    username,
    displayName: username,
    role: 'player',
  });
  return cred.user;
};

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  const cred = await signInWithPopup(auth, googleProvider);
  // Create a profile on first Google sign-in.
  const existing = await getUser(cred.user.uid);
  if (!existing) {
    const base = slugify(cred.user.displayName ?? cred.user.email?.split('@')[0] ?? 'player');
    let username = base || `player${Date.now().toString().slice(-5)}`;
    if (await isUsernameTaken(username)) username = `${username}-${Date.now().toString().slice(-4)}`;
    await createUserProfile(cred.user.uid, {
      email: cred.user.email ?? '',
      username,
      displayName: cred.user.displayName ?? username,
      avatarUrl: cred.user.photoURL ?? undefined,
      role: 'player',
    });
  }
  return cred.user;
};

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const logout = () => signOut(auth);
