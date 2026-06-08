import React, { useContext, useEffect } from "react";
import AppText from "./components/common/AppText";
import {
  Platform,
  Image,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  PermissionsAndroid,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthProvider, AuthContext } from "./Context/AuthContext";
import { NotificationProvider } from "./Context/NotificationContext";
import { FontScaleProvider, useFontScale } from "./Context/FontScaleContext";
import Login from "./screens/Auth/Login";
import ForgotPassword from "./screens/Auth/ForgotPassword";
import ResetPassword from "./screens/Auth/ResetPassword";
import SecuritySetup from "./screens/Auth/SecuritySetup";
import messaging from "@react-native-firebase/messaging";
import Dashboard from "./Layout/Dashboard";

import DrawerContent from "./components/DrawerContent";
import useResponsiveWeb from "./Layout/useResponsiveWeb";
import LinkingConfig from "./utilities/LinkingConfig";
import { API_BASE } from "./utilities/API_BASE";
import OTP from "./screens/Auth/OTP";
import LoadingScreen from "./screens/LoadingScreen";
import NotificationBell from "./components/Notifications/NotificationBell";
import { navigationRef } from "./utilities/navigationRef";
import { getUserImageUri, getUserInitials } from "./utilities/avatar";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const withDashboard = (loadScreen) => {
  function DashboardScreen(props) {
    const Screen = loadScreen();
    return (
      <Dashboard currentRouteName={props?.route?.name}>
        <Screen {...props} />
      </Dashboard>
    );
  }

  return DashboardScreen;
};

const Screens = {
  ReportsAndAnalytics: withDashboard(
    () => require("./screens/Main/ReportsAndAnalytics").default,
  ),
  Messages: withDashboard(() => require("./screens/Main/Messaging").default),
  ManageUsers: withDashboard(
    () => require("./screens/Main/UserManagement").default,
  ),
  ActivityLogs: withDashboard(
    () => require("./screens/Main/ActivityLogs").default,
  ),
  FlightLogs: withDashboard(() => require("./screens/Main/FlightLog").default),
  MaintenanceLogs: withDashboard(
    () => require("./screens/Main/MaintenanceLog").default,
  ),
  PreInspection: withDashboard(
    () => require("./screens/Main/PreInspection").default,
  ),
  PostInspection: withDashboard(
    () => require("./screens/Main/PostInspection").default,
  ),
  Tasks: withDashboard(() => require("./screens/Main/TaskAssignment").default),
  Mechanics: withDashboard(
    () => require("./screens/Main/MechanicList").default,
  ),
  PartsLifespanMonitoring: withDashboard(
    () => require("./screens/Main/PartsLifespanMonitoring").default,
  ),
  MaintenanceTracking: withDashboard(
    () => require("./screens/Main/MaintenanceTracking").default,
  ),
  MaintenancePrioritySorting: withDashboard(
    () => require("./screens/Main/MaintenancePriority").default,
  ),
  PartsRequisitionMonitoring: withDashboard(
    () => require("./screens/Main/PartsRequisition").default,
  ),
  Profile: withDashboard(() => require("./screens/Settings/Profile").default),
};

function DrawerNav({ navigation }) {
  const { user, loading } = useContext(AuthContext);
  const { scale } = useFontScale();
  const normalizedRole = user?.jobTitle?.toLowerCase() || "";
  const canAccessFlightAndPreInspection = [
    "maintenance manager",
    "pilot",
    "officer-in-charge",
    "mechanic",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessPostInspection = [
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessMechanics = ["maintenance manager", "superadmin"].includes(
    normalizedRole,
  );
  const canAccessTasks = ["superadmin", "maintenance manager", "mechanic"].includes(
    normalizedRole,
  );
  const canAccessPartsRequisition = [
    "maintenance manager",
    "mechanic",
    "officer-in-charge",
    "warehouse department",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessPartsMonitoring = [
    "maintenance manager",
    "officer-in-charge",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessMaintenancePriority = [
    "maintenance manager",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessReports = [
    "maintenance manager",
    "officer-in-charge",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessMaintenanceLog = [
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
    "superadmin",
  ].includes(normalizedRole);
  const canAccessMessages = [
    "superadmin",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse department",
  ].includes(normalizedRole);
  const canAccessProfile = [
    "superadmin",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse department",
  ].includes(normalizedRole);
  const canAccessUserManagement = normalizedRole === "superadmin";
  const canAccessActivityLogs = normalizedRole === "superadmin";
  const initialDrawerRoute = canAccessReports
    ? "Reports and Analytics"
    : canAccessMessages
      ? "Messages"
      : canAccessUserManagement
        ? "Manage Users"
        : canAccessFlightAndPreInspection
          ? "Flight Logs"
          : canAccessTasks
            ? "Tasks"
            : canAccessPartsRequisition
              ? "Parts Requisition"
              : "Profile";
  const profileImage = getUserImageUri(user?.image);
  const isWeb = Platform.OS === "web";
  const isWide = useResponsiveWeb();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return <LoadingScreen message="Preparing your session..." />;

  const navLabel = {
    headerTitleStyle: {
      fontSize: scale(14),
      fontWeight: 200,
    },
  };

  return (
    <Drawer.Navigator
      initialRouteName={initialDrawerRoute}
      backBehavior="history"
      detachInactiveScreens
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        lazy: true,
        freezeOnBlur: true,
        drawerType: "slide",
        drawerStyle: { width: "85%" },
        overlayColor: "transparent",
        headerRight: () => (
          <View
            style={{
              paddingHorizontal: 7,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <NotificationBell navigation={navigation} />
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() => navigation.navigate("Profile")}
            >
              {profileImage ? (
                <Image
                  source={{
                    uri: profileImage,
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 5,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 5,
                    backgroundColor: "#E6F4F1",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText style={{ color: "#26866F", fontWeight: "700" }}>
                    {getUserInitials(user?.firstName, user?.lastName)}
                  </AppText>
                </View>
              )}
              {isWeb && isWide && (
                <View style={{ flexDirection: "column" }}>
                  <AppText style={{ fontSize: scale(14), fontWeight: "600" }}>
                    {`${user.firstName} ${user.lastName}` || "User"}
                  </AppText>
                  <AppText style={{ fontSize: scale(12), color: "#777" }}>
                    {user?.jobTitle || ""}
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ),
      })}
    >
      {canAccessReports && (
        <Drawer.Screen
          name="Reports and Analytics"
          component={Screens.ReportsAndAnalytics}
          options={navLabel}
        />
      )}

      {canAccessMessages && (
        <Drawer.Screen
          name="Messages"
          component={Screens.Messages}
          options={navLabel}
        />
      )}

      {canAccessUserManagement && (
        <Drawer.Screen
          name="Manage Users"
          component={Screens.ManageUsers}
          options={navLabel}
        />
      )}

      {canAccessActivityLogs && (
        <Drawer.Screen
          name="Activity Logs"
          component={Screens.ActivityLogs}
          options={navLabel}
        />
      )}

      {(canAccessFlightAndPreInspection ||
        canAccessMaintenanceLog ||
        canAccessPostInspection) && (
        <>
          {canAccessFlightAndPreInspection && (
            <Drawer.Screen
              name="Flight Logs"
              component={Screens.FlightLogs}
              options={navLabel}
            />
          )}
          {canAccessMaintenanceLog && (
            <Drawer.Screen
              name="Maintenance Logs"
              component={Screens.MaintenanceLogs}
              options={navLabel}
            />
          )}
          {canAccessFlightAndPreInspection && (
            <Drawer.Screen
              name="Pre-Inspection"
              component={Screens.PreInspection}
              options={navLabel}
            />
          )}
          {canAccessPostInspection && (
            <Drawer.Screen
              name="Post-Inspection"
              component={Screens.PostInspection}
              options={navLabel}
            />
          )}
        </>
      )}

      {canAccessTasks && (
        <>
          <Drawer.Screen
            name="Tasks"
            component={Screens.Tasks}
            options={navLabel}
          />
        </>
      )}

      {canAccessMechanics && (
        <Drawer.Screen
          name="Mechanics"
          component={Screens.Mechanics}
          options={navLabel}
        />
      )}

      {canAccessPartsMonitoring && (
        <>
          <Drawer.Screen
            name="Parts Lifespan Monitoring"
            component={Screens.PartsLifespanMonitoring}
            options={navLabel}
          />
          <Drawer.Screen
            name="Maintenance Tracking"
            component={Screens.MaintenanceTracking}
            options={navLabel}
          />
        </>
      )}
      {canAccessMaintenancePriority && (
        <Drawer.Screen
          name="Maintenance Priority Sorting"
          component={Screens.MaintenancePrioritySorting}
          options={navLabel}
        />
      )}

      {canAccessPartsRequisition && (
        <Drawer.Screen
          name="Parts Requisition"
          component={Screens.PartsRequisitionMonitoring}
          options={navLabel}
        />
      )}

      {canAccessProfile && (
        <Drawer.Screen
          name="Profile"
          component={Screens.Profile}
          options={navLabel}
        />
      )}
    </Drawer.Navigator>
  );
}

function LoginWrapper({ navigation, ...props }) {
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (user.status === "active") {
      navigation.replace("dashboard");
      return;
    }

    if (user.status === "deactivated") {
      return;
    }

    if (user.status === "inactive") {
      navigation.replace("securitySetup", {
        setupToken: user.setupToken,
        email: user.email,
      });

      return;
    }
  }, [user, loading, navigation]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <Login {...props} />;
}

// --- Stack navigator ---
function StackNavWrapper() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator
      initialRouteName={user ? "dashboard" : "login"}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" component={LoginWrapper} />
      <Stack.Screen name="otpScreen" component={OTP} />
      <Stack.Screen name="securitySetup" component={SecuritySetup} />
      <Stack.Screen
        name="dashboard"
        component={DrawerNav}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="forgotPassword" component={ForgotPassword} />
      <Stack.Screen name="resetPassword" component={ResetPassword} />
    </Stack.Navigator>
  );
}

function AppShell({ linking }) {
  const {
    user,
    recordActivity,
    showSessionTimeoutWarning,
    warningSecondsRemaining,
    continueSession,
    logoutUser,
  } = useContext(AuthContext);
  const { scale } = useFontScale();
  const shouldShowSessionWarning =
    Boolean(user) &&
    showSessionTimeoutWarning === true &&
    Number.isFinite(warningSecondsRemaining) &&
    warningSecondsRemaining > 0;

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        if (user) {
          recordActivity?.();
        }
        return false;
      }}
    >
      <NavigationContainer
        linking={linking}
        ref={navigationRef}
        onStateChange={() => {
          if (user) {
            recordActivity?.();
          }
        }}
      >
        <StackNavWrapper />
      </NavigationContainer>
      <Modal
        transparent
        animationType="fade"
        visible={shouldShowSessionWarning}
        onRequestClose={() => continueSession?.()}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <AppText
              style={{
                fontSize: scale(14),
                fontWeight: "600",
                marginBottom: 10,
              }}
            >
              Session Timeout Warning
            </AppText>
            <AppText style={{ fontSize: scale(12), color: "#333", marginBottom: 8 }}>
              You&apos;ve been inactive for a while. For your security,
              you&apos;ll be signed out in 2 minutes unless you continue.
            </AppText>
            <AppText style={{ fontSize: scale(12), color: "#666", marginBottom: 16 }}>
              Auto sign-out in {Math.max(0, warningSecondsRemaining || 0)}{" "}
              seconds.
            </AppText>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
              }}
            >
              <Pressable
                onPress={() => logoutUser?.()}
                style={{
                  borderWidth: 1,
                  borderColor: "#d9d9d9",
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <AppText style={{ color: "#333", fontSize: scale(12) }}>
                  Sign out now
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => continueSession?.()}
                style={{
                  backgroundColor: "#26866F",
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  marginLeft: 8,
                }}
              >
                <AppText style={{ color: "#fff", fontWeight: "600", fontSize: scale(12) }}>
                  Continue session
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function AppProviders() {
  const linking = LinkingConfig;
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, text: "#000000", primary: "#26866F" },
    icons: {
      ...DefaultTheme.icons,
      icon: (props) => {
        if (!props.name) return null; // skip rendering if no name
        return <MaterialCommunityIcons {...props} />;
      },
    },
  };

  useEffect(() => {
    const requestNotificationPermissionOnFirstOpen = async () => {
      try {
        if (Platform.OS === "web") return;

        if (Platform.OS === "ios") {
          await messaging().requestPermission();
          return;
        }

        if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
      } catch (error) {
        console.log("Initial notification permission prompt failed:", error);
      }
    };

    requestNotificationPermissionOnFirstOpen();
  }, []);

  return (
    <NotificationProvider>
      <PaperProvider theme={theme}>
        <AppShell linking={linking} />
      </PaperProvider>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FontScaleProvider>
        <AppProviders />
      </FontScaleProvider>
    </AuthProvider>
  );
}
