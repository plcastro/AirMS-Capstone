import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect, useContext } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";
import { ConfigProvider, Spin } from "antd";
import { AuthContext, AuthProvider } from "./context/AuthContext";

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
const MaintenanceReport = lazy(
  () => import("./pages/dashboard/reports/MaintenanceReport"),
);
const PartsMonitoring = lazy(
  () => import("./pages/dashboard/parts-monitoring/PartsMonitoring"),
);
const MaintenanceTracking = lazy(
  () => import("./pages/dashboard/parts-monitoring/MaintenanceTracking"),
);

const MaintenancePriority = lazy(
  () => import("./pages/dashboard/priority-sorting/MaintenancePriority"),
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
          <Route
            path="parts-monitoring/maintenance-tracking"
            element={<MaintenanceTracking />}
          />
          <Route
            path="parts-monitoring/pm-table"
            element={<PartsMonitoring />}
          />
          <Route
            path="maintenance-priority"
            element={<MaintenancePriority />}
          />
          <Route path="inventory-management" element={<Inventory />} />
          <Route path="maintenance-report" element={<MaintenanceReport />} />
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
            itemBg: "#f5f5f5",
            itemSelectedColor: "#e6f7f1",
            itemSelectedBg: "#26866f",
            itemColor: "#000",
            itemSelectedColor: "#fff",
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
