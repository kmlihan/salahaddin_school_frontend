import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
      <div className="animate-pulse">Loading…</div>
    </div>
  );
}

export default function ProtectedRoute({ roles, children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
