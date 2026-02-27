import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

// Authentication
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import OTP from "./pages/auth/OTP";
import ResetPassword from "./pages/auth/ResetPassword";
import SecuritySetup from "./pages/auth/SecuritySetup";
// Dashboard
import UserManagement from "./pages/dashboard/UserManagement";
import UserLogs from "./pages/dashboard/UserLogs";
import FlightLog from "./pages/dashboard/FlightLog";
import MaintenanceLog from "./pages/dashboard/MaintenanceLog";
import Inventory from "./pages/dashboard/Inventory";
import Profile from "./pages/dashboard/Profile";
import NotFound from "./pages/NotFound";

import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";
import { ConfigProvider } from "antd";

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
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: "#26866f",
            headerColor: "#fff",
          },
          Button: {
            colorPrimary: "#26866f",
          },
          Menu: {
            colorItemBg: "#f5f5f5",
            colorItemBgHover: "#e6f7f1",
            colorItemBgSelected: "#26866f",
            colorItemText: "#000",
            colorItemTextHover: "#000",
            colorItemTextSelected: "#fff",
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Authentication */}
          <Route element={<RootLayout />}>
            <Route path="/login" element={<Login />} />

            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/otp" element={<OTP />} />
            <Route path="/reset/:token" element={<ResetPassword />} />
            <Route path="/security-setup" element={<SecuritySetup />} />
          </Route>

          {/* Dashboard pages */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route
              path="user-management/view-users"
              element={<UserManagement />}
            />
            <Route
              path="user-management/activity-logs"
              element={<UserLogs />}
            />
            <Route path="flight-log" element={<FlightLog />} />
            <Route path="maintenance-log" element={<MaintenanceLog />} />
            <Route path="inventory-management" element={<Inventory />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
