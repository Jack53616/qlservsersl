import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, superAdminOnly = false }) {
  const { admin, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-ql-green/30 border-t-ql-green animate-spin" />
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/" replace />;

  return children;
}
