import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedJobTitle = String(user?.jobTitle || "")
    .trim()
    .toLowerCase();
  const normalizedAccess = String(user?.access || "")
    .trim()
    .toLowerCase();
  const resolvedRole = normalizedJobTitle || normalizedAccess;

  if (allowedRoles && !allowedRoles.includes(resolvedRole)) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  return children;
};

export default ProtectedRoute;
