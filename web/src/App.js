import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect, useContext } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";
import { ConfigProvider, Spin } from "antd";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./pages/auth/ProtectedRoute";

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
const MaintenanceDashboard = lazy(
  () => import("./pages/dashboard/reports/MaintenanceDashboard"),
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
const ComplianceTracking = lazy(
  () => import("./pages/dashboard/parts-monitoring/ComplianceTracking"),
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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/security-setup" element={<SecuritySetup />} />
        </Route>

        {/* Dashboard pages */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route
            path="user-management/view-users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="user-management/activity-logs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="flight-log"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "maintenance manager",
                  "pilot",
                  "officer-in-charge",
                ]}
              >
                <FlightLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="maintenance-log"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "maintenance manager",
                  "pilot",
                  "officer-in-charge",
                ]}
              >
                <MaintenanceLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="parts-monitoring"
            element={
              <ProtectedRoute
                allowedRoles={["maintenance manager", "officer-in-charge"]}
              >
                <PartsMonitoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="maintenance-tracking"
            element={
              <ProtectedRoute
                allowedRoles={["maintenance manager", "officer-in-charge"]}
              >
                <MaintenanceTracking />
              </ProtectedRoute>
            }
          />

          <Route
            path="maintenance-priority"
            element={
              <ProtectedRoute allowedRoles={["maintenance manager"]}>
                <MaintenancePriority />
              </ProtectedRoute>
            }
          />
          <Route
            path="maintenance-dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["maintenance manager", "officer-in-charge"]}
              >
                <MaintenanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="compliance-tracking"
            element={
              <ProtectedRoute
                allowedRoles={["maintenance manager", "officer-in-charge"]}
              >
                <ComplianceTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "maintenance manager",
                  "pilot",
                  "officer-in-charge",
                  "engineer",
                ]}
              >
                <Profile />
              </ProtectedRoute>
            }
          />
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
          Table: {
            headerBg: "#26866f",
            headerColor: "#fff",
            headerSortHoverBg: "#1f6654",
            headerSortActiveBg: "#1f6654",
            headerFilterHoverBg: "#1f6654",
          },
          Button: { colorPrimary: "#26866f", colorPrimaryHover: "#1f6654" },
          Menu: {
            itemBg: "#f5f5f5",
            itemHoverBg: "#006340",
            itemHoverColor: "#fff",
            itemSelectedBg: "#26866f",
            itemColor: "#000",
            itemSelectedColor: "#fff",
            itemActiveBg: "#26866f",
            subMenuItemSelectedColor: "#002019",
          },
          Tabs: {
            inkBarColor: "#006340",
            itemSelectedColor: "#006340",
            itemHoverColor: "#26866f",
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
