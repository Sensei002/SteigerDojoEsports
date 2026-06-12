import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { FiLock } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  /** Roles allowed through. Defaults to staff (admin + organizer). */
  roles?: UserRole[];
}

/** Guards staff/admin-only routes. */
const AdminRoute = ({ children, roles = ['admin', 'organizer'] }: Props) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={<FiLock size={40} />}
          title="Access denied"
          description="You don't have permission to view this page."
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
