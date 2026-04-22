import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useEffect, useContext } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";
import { Button, ConfigProvider, Modal, Spin } from "antd";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./pages/auth/ProtectedRoute";

const LoadingScreen = () => (
  <div
    style={{
      height: "100vh",
      width: "100%",
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
const AdminDashboard = lazy(
  () => import("./pages/dashboard/user-management/AdminDashboard"),
);
const FlightLog = lazy(() => import("./pages/dashboard/logbook/FlightLog"));
const MaintenanceLog = lazy(
  () => import("./pages/dashboard/logbook/MaintenanceLog"),
);
const MaintenanceDashboard = lazy(
  () => import("./pages/dashboard/reports/MaintenanceDashboard"),
);
const PartsLifespanMonitoring = lazy(
  () => import("./pages/dashboard/parts-monitoring/PartsLifespanMonitoring"),
);
const PartsRequisition = lazy(
  () => import("./pages/dashboard/parts-monitoring/PartsReqMonitoring"),
);
const MaintenanceTracking = lazy(
  () => import("./pages/dashboard/parts-monitoring/MaintenanceTracking"),
);

const MaintenancePriority = lazy(
  () => import("./pages/dashboard/priority-sorting/MaintenancePriority"),
);
const Profile = lazy(
  () => import("./pages/dashboard/account-settings/Profile"),
);
const NotFound = lazy(() => import("./pages/NotFound"));

const AppRouter = () => {
  const {
    loading,
    showSessionTimeoutWarning,
    warningSecondsRemaining,
    continueSession,
    logoutUser,
  } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Modal
        open={showSessionTimeoutWarning}
        closable={false}
        mask={{ closable: false }}
        centered
        footer={[
          <Button key="logout" onClick={() => logoutUser()}>
            Sign out now
          </Button>,
          <Button key="continue" type="primary" onClick={continueSession}>
            Continue session
          </Button>,
        ]}
        title="Session Timeout Warning"
      >
        <p style={{ marginBottom: 8 }}>
          You&apos;ve been inactive for a while. For your security, you&apos;ll
          be signed out in 2 minutes unless you continue.
        </p>
        <p style={{ marginBottom: 0 }}>
          Auto sign-out in <strong>{warningSecondsRemaining}</strong> seconds.
        </p>
      </Modal>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Authentication */}
          <Route element={<RootLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/verification" element={<OTP />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/security-setup" element={<SecuritySetup />} />
          </Route>

          {/* Dashboard pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="user-management/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
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
                  allowedRoles={["maintenance manager", "officer-in-charge"]}
                >
                  <FlightLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance-log"
              element={
                <ProtectedRoute
                  allowedRoles={["maintenance manager", "officer-in-charge"]}
                >
                  <MaintenanceLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="parts-lifespan-monitoring"
              element={
                <ProtectedRoute
                  allowedRoles={["maintenance manager", "officer-in-charge"]}
                >
                  <PartsLifespanMonitoring />
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
              path="parts-requisition"
              element={
                <ProtectedRoute allowedRoles={["warehouse department"]}>
                  <PartsRequisition />
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
                    "officer-in-charge",
                    "warehouse department",
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
    </>
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
            headerBorderRadius: 10,
            headerBorderColor: "#002019",
          },
          Button: { colorPrimary: "#26866f", colorPrimaryHover: "#1f6654" },
          Menu: {
            itemBg: "#f5f5f5",
            itemHoverBg: "#006340",
            itemHoverColor: "#fff",
            itemSelectedBg: "#26866f",
            itemColor: "#002019",
            itemSelectedColor: "#fff",
            itemActiveBg: "#26866f",
            subMenuItemSelectedColor: "#002019",
          },
          Tabs: {
            inkBarColor: "#006340",
            itemSelectedColor: "#006340",
            itemHoverColor: "#26866f",
          },
          Statistic: {
            fontSize: "clamp(14px, 16px)",
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
