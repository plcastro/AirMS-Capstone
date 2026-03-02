import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect, useContext } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";
import { ConfigProvider, Spin } from "antd";
import { AuthContext, AuthProvider } from "./context/AuthContext";
// // Authentication
// import Login from "./pages/auth/Login";
// import ForgotPassword from "./pages/auth/ForgotPassword";
// import OTP from "./pages/auth/OTP";
// import ResetPassword from "./pages/auth/ResetPassword";
// import SecuritySetup from "./pages/auth/SecuritySetup";
// // Dashboard
// import UserManagement from "./pages/dashboard/UserManagement";
// import UserLogs from "./pages/dashboard/UserLogs";
// import FlightLog from "./pages/dashboard/FlightLog";
// import MaintenanceLog from "./pages/dashboard/MaintenanceLog";
// import Inventory from "./pages/dashboard/Inventory";
// import Profile from "./pages/dashboard/Profile";
// import NotFound from "./pages/NotFound";
const LoadingScreen = () => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f5f5f5",
    }}
  >
    <Spin size="large" description="Loading System..." />
  </div>
);
const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const OTP = lazy(() => import("./pages/auth/OTP"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const SecuritySetup = lazy(() => import("./pages/auth/SecuritySetup"));
const UserManagement = lazy(
  () => import("./pages/dashboard/user-management/UserManagement"),
);
const UserLogs = lazy(
  () => import("./pages/dashboard/user-management/UserLogs"),
);
const FlightLog = lazy(() => import("./pages/dashboard/logbook/FlightLog"));
const MaintenanceLog = lazy(
  () => import("./pages/dashboard/logbook/MaintenanceLog"),
);
const Inventory = lazy(() => import("./pages/dashboard/inventory/Inventory"));
const MaintenancePerf = lazy(
  () => import("./pages/dashboard/reports/MaintenancePerformance"),
);
const MaintenanceSummary = lazy(
  () => import("./pages/dashboard/reports/MaintenanceSummary"),
);
const MaintenanceHistory = lazy(
  () => import("./pages/dashboard/reports/MaintenanceHistory"),
);
const ComponentUsage = lazy(
  () => import("./pages/dashboard/reports/ComponentUsage"),
);
const Profile = lazy(() => import("./pages/dashboard/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AppRouter = () => {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
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
          <Route path="user-management/activity-logs" element={<UserLogs />} />
          <Route path="flight-log" element={<FlightLog />} />
          <Route path="maintenance-log" element={<MaintenanceLog />} />
          <Route path="inventory-management" element={<Inventory />} />
          <Route
            path="maintenance-report/maintenance-performance"
            element={<MaintenancePerf />}
          />
          <Route
            path="maintenance-report/maintenance-summary"
            element={<MaintenanceSummary />}
          />
          <Route
            path="maintenance-report/maintenance-history"
            element={<MaintenanceHistory />}
          />
          <Route
            path="maintenance-report/component-usage"
            element={<ComponentUsage />}
          />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};
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
          Table: { headerBg: "#26866f", headerColor: "#fff" },
          Button: { colorPrimary: "#26866f", colorPrimaryHover: "#1f6654" },
          Menu: {
            colorItemBg: "#f5f5f5",
            colorItemBgHover: "#e6f7f1",
            colorItemBgSelected: "#26866f",
            colorItemText: "#000",
            colorItemTextSelected: "#fff",
          },
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
