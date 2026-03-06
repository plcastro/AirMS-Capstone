import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const position = user?.position?.toLowerCase();

  if (allowedRoles && !allowedRoles.includes(position)) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  return children;
};

export default ProtectedRoute;
