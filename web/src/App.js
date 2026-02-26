import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

// Authentication
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import OTP from "./pages/auth/OTP";
import ResetPassword from "./pages/auth/ResetPassword";

// Dashboard
import UserManagement from "./pages/dashboard/UserManagement";
import Profile from "./pages/dashboard/Profile";
import NotFound from "./pages/NotFound";

import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";

export default function App() {
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "rememberMe" && event.newValue === "false") {
        localStorage.removeItem("currentUser");
        window.location.href = "/login";
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Authentication */}
        <Route element={<RootLayout />}>
          <Route path="/otp" element={<OTP />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />

          <Route path="/reset/:token" element={<ResetPassword />} />
        </Route>

        {/* Dashboard pages */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="user-management" element={<UserManagement />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
