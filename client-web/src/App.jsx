import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import React, {
  Suspense,
  lazy,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import RootLayout from "./components/layout/RootLayout";
import { App as AntdApp, Button, ConfigProvider, Modal, Spin } from "antd";
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
const FlightLog = lazy(() => import("./pages/dashboard/logbook/FlightLog"));
const MaintenanceLog = lazy(
  () => import("./pages/dashboard/logbook/MaintenanceLog"),
);
const PreInspection = lazy(
  () => import("./pages/dashboard/logbook/PreInspection"),
);
const PostInspection = lazy(
  () => import("./pages/dashboard/logbook/PostInspection"),
);
const TaskAssignment = lazy(
  () => import("./pages/dashboard/logbook/TaskAssignment"),
);
const MechanicList = lazy(
  () => import("./pages/dashboard/logbook/MechanicList"),
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
const Messaging = lazy(() => import("./pages/dashboard/messages/Messaging"));
const Profile = lazy(
  () => import("./pages/dashboard/account-settings/Profile"),
);
const NotFound = lazy(() => import("./pages/NotFound"));
const WEB_SETTINGS_KEY = "webProfileSettings";
const WEB_FONT_RECOMMENDED = 1;
const WEB_FONT_MAX = 1.3;

const clampFontScale = (value) =>
  Math.min(
    Math.max(Number(value) || WEB_FONT_RECOMMENDED, WEB_FONT_RECOMMENDED),
    WEB_FONT_MAX,
  );

const resolveStoredFontScale = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_KEY) || "{}");
    const storedFont = stored?.fontSizePreference;
    if (typeof storedFont === "number") return clampFontScale(storedFont);
    return (
      {
        small: 0.9,
        medium: 1,
        large: 1.1,
      }[storedFont] || WEB_FONT_RECOMMENDED
    );
  } catch {
    return WEB_FONT_RECOMMENDED;
  }
};

const getUserHomePath = (user) => {
  const role = String(user?.jobTitle || user?.access || "")
    .trim()
    .toLowerCase();

  switch (role) {
    case "superadmin":
      return "/dashboard/user-management/view-users";
    case "mechanic":
      return "/dashboard/maintenance-log";
    case "maintenance manager":
    case "officer-in-charge":
      return "/dashboard/maintenance-dashboard";
    case "warehouse staff":
      return "/dashboard/parts-requisition";
    default:
      return "/dashboard/profile";
  }
};

const AppRouter = () => {
  const navigate = useNavigate();
  const {
    user,
    loading,
    showSessionTimeoutWarning,
    warningSecondsRemaining,
    continueSession,
    logoutUser,
  } = useContext(AuthContext);

  const handleSignOutNow = async () => {
    await logoutUser();
    navigate("/login", { replace: true });
  };

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
          <Button key="logout" onClick={handleSignOutNow}>
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
          be signed out unless you continue.
        </p>
        <p style={{ marginBottom: 0 }}>
          Auto sign-out in <strong>{warningSecondsRemaining}</strong> seconds.
        </p>
      </Modal>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={user ? getUserHomePath(user) : "/login"} replace />
            }
          />

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
              path="user-management/view-users"
              element={
                <ProtectedRoute allowedRoles={["superadmin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-management/activity-logs"
              element={
                <ProtectedRoute allowedRoles={["superadmin"]}>
                  <UserLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="flight-log"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "pilot",
                    "mechanic",
                  ]}
                >
                  <FlightLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="pre-inspection"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "pilot",
                    "mechanic",
                  ]}
                >
                  <PreInspection />
                </ProtectedRoute>
              }
            />
            <Route
              path="post-inspection"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "mechanic",
                  ]}
                >
                  <PostInspection />
                </ProtectedRoute>
              }
            />
            <Route
              path="tasks"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "mechanic",
                  ]}
                >
                  <TaskAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="mechanics"
              element={
                <ProtectedRoute
                  allowedRoles={["superadmin", "maintenance manager"]}
                >
                  <MechanicList />
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance-log"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "mechanic",
                  ]}
                >
                  <MaintenanceLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="parts-lifespan-monitoring"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                  ]}
                >
                  <PartsLifespanMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance-tracking"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                  ]}
                >
                  <MaintenanceTracking />
                </ProtectedRoute>
              }
            />

            <Route
              path="maintenance-priority"
              element={
                <ProtectedRoute
                  allowedRoles={["superadmin", "maintenance manager"]}
                >
                  <MaintenancePriority />
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance-dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                  ]}
                >
                  <MaintenanceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="parts-requisition"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "mechanic",
                    "warehouse staff",
                  ]}
                >
                  <PartsRequisition />
                </ProtectedRoute>
              }
            />
            <Route
              path="messages"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "warehouse staff",
                    "mechanic",
                  ]}
                >
                  <Messaging />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "maintenance manager",
                    "officer-in-charge",
                    "warehouse staff",
                    "mechanic",
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
  const [fontScale, setFontScale] = useState(() => resolveStoredFontScale());

  useEffect(() => {
    const applyScale = (nextScale) => {
      const clamped = clampFontScale(nextScale);
      setFontScale(clamped);
      document.documentElement.style.fontSize = `${(16 * clamped).toFixed(1)}px`;
    };

    const syncScaleFromSettings = () => applyScale(resolveStoredFontScale());

    syncScaleFromSettings();
    window.addEventListener("storage", syncScaleFromSettings);
    window.addEventListener("web-settings-updated", syncScaleFromSettings);

    return () => {
      window.removeEventListener("storage", syncScaleFromSettings);
      window.removeEventListener("web-settings-updated", syncScaleFromSettings);
    };
  }, []);

  const scaledTheme = useMemo(
    () => ({
      token: {
        fontSize: Math.round(14 * fontScale),
        fontSizeSM: Math.round(12 * fontScale),
        fontSizeLG: Math.round(16 * fontScale),
      },
      components: {
        Table: {
          headerBg: "#26866f",
          headerColor: "#fff",
          headerSortHoverBg: "#1f6654",
          headerSortActiveBg: "#1f6654",
          headerFilterHoverBg: "#1f6654",
          headerBorderRadius: 10,
          headerBorderColor: "#1f6654",
          fontSize: Math.round(14 * fontScale),
        },
        Button: { colorPrimary: "#26866f", colorPrimaryHover: "#1f6654" },
        Menu: {
          colorBgContainer: "#ffffff",
          itemBg: "#ffffff",
          subMenuItemBg: "#ffffff",
          popupBg: "#ffffff",

          itemColor: "#575757",
          itemHoverColor: "#006340",
          itemSelectedColor: "#ffffff",

          itemHoverBg: "#ffffff",
          itemSelectedBg: "#006340",
          itemActiveBg: "#ffffff",

          subMenuItemSelectedColor: "#006340",
        },
        Tabs: {
          inkBarColor: "#006340",
          itemSelectedColor: "#006340",
          itemHoverColor: "#26866f",
        },
        Card: {
          paddingLG: 16,
          paddingSM: 12,
          headerHeight: 44,
          headerHeightSM: 36,
        },
        Statistic: {
          fontSize: `${Math.round(12 * fontScale)}px`,
          contentFontSize: `${Math.round(20 * fontScale)}px`,
        },
      },
    }),
    [fontScale],
  );

  return (
    <ConfigProvider theme={scaledTheme}>
      <AntdApp>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
