import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getUser } from '@/services/userService';
import type { AppUser, UserRole } from '@/types';
import { STAFF_ROLES } from '@/utils/constants';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (fb: FirebaseUser | null) => {
    if (!fb) {
      setUser(null);
      return;
    }
    const profile = await getUser(fb.uid);
    setUser(profile);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fb) => {
      setFirebaseUser(fb);
      await loadProfile(fb);
      setLoading(false);
    });
    return unsub;
  }, [loadProfile]);

  const refreshUser = useCallback(() => loadProfile(firebaseUser), [firebaseUser, loadProfile]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user]
  );

  const value: AuthContextValue = {
    firebaseUser,
    user,
    loading,
    isAuthenticated: !!firebaseUser,
    isAdmin: user?.role === 'admin',
    isStaff: !!user && STAFF_ROLES.includes(user.role),
    hasRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
