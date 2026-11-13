import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
