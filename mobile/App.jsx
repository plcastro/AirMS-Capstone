import React, { useContext, useEffect } from "react";
import {
  Platform,
  Image,
  TouchableOpacity,
  Text,
  View,
  Modal,
  Pressable,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { AuthProvider, AuthContext } from "./Context/AuthContext";
import { NotificationProvider } from "./Context/NotificationContext";
import Login from "./screens/Auth/Login";
import ForgotPassword from "./screens/Auth/ForgotPassword";
import ResetPassword from "./screens/Auth/ResetPassword";
import SecuritySetup from "./screens/Auth/SecuritySetup";

import Dashboard from "./Layout/Dashboard";

import DrawerContent from "./components/DrawerContent";
import useResponsiveWeb from "./Layout/useResponsiveWeb";
import LinkingConfig from "./utilities/LinkingConfig";
import { API_BASE } from "./utilities/API_BASE";
import OTP from "./screens/Auth/OTP";
import LoadingScreen from "./screens/LoadingScreen";
import NotificationBell from "./components/Notifications/NotificationBell";
import { navigationRef } from "./utilities/navigationRef";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const withDashboard = (loadScreen) => {
  function DashboardScreen(props) {
    const Screen = loadScreen();
    return (
      <Dashboard>
        <Screen {...props} />
      </Dashboard>
    );
  }

  return DashboardScreen;
};

const Screens = {
  ReportsAndAnalytics: withDashboard(
    () => require("./screens/Main/MaintenanceDashboard").default,
  ),
  Messages: withDashboard(() => require("./screens/Main/Messaging").default),
  ManageUsers: withDashboard(
    () => require("./screens/Main/UserManagement.jsx").default,
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
  const normalizedRole = user?.jobTitle?.toLowerCase() || "";
  const canAccessFlightAndPreInspection = [
    "admin",
    "maintenance manager",
    "pilot",
    "officer-in-charge",
    "mechanic",
  ].includes(normalizedRole);
  const canAccessPostInspection = [
    "admin",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ].includes(normalizedRole);
  const canAccessMechanics = normalizedRole === "maintenance manager";
  const canAccessTasks = ["admin", "maintenance manager", "mechanic"].includes(
    normalizedRole,
  );
  const canAccessPartsRequisition = [
    "admin",
    "maintenance manager",
    "mechanic",
    "officer-in-charge",
    "warehouse department",
  ].includes(normalizedRole);
  const canAccessPartsMonitoring = [
    "admin",
    "maintenance manager",
    "officer-in-charge",
  ].includes(normalizedRole);
  const canAccessMaintenancePriority = normalizedRole === "maintenance manager";
  const canAccessReports = [
    "admin",
    "maintenance manager",
    "officer-in-charge",
  ].includes(normalizedRole);
  const canAccessMaintenanceLog = [
    "admin",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ].includes(normalizedRole);
  const canAccessMessages = [
    "admin",
    "maintenance manager",
    "mechanic",
    "officer-in-charge",
    "warehouse department",
  ].includes(normalizedRole);
  const canAccessProfile = [
    "admin",
    "maintenance manager",
    "mechanic",
    "officer-in-charge",
    "warehouse department",
  ].includes(normalizedRole);
  const canAccessUserManagement = normalizedRole === "admin";
  const canAccessActivityLogs = normalizedRole === "admin";

  const profileImage =
    user?.image && typeof user.image === "string"
      ? user.image.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image}`
      : `${API_BASE}/uploads/default_avatar.jpg`;
  const isWeb = Platform.OS === "web";
  const isWide = useResponsiveWeb();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const navLabel = {
    headerTitleStyle: {
      fontSize: 12,
      fontWeight: 200,
    },
  };

  return (
    <Drawer.Navigator
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
              {isWeb && isWide && (
                <View style={{ flexDirection: "column" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600" }}>
                    {`${user.firstName} ${user.lastName}` || "User"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#777" }}>
                    {user?.jobTitle || ""}
                  </Text>
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
          name="Parts Requisition Monitoring"
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

    if (user.status === "deactivated") {
      return;
    }

    if (user.status === "inactive") {
      console.log(user.setupToken);
      navigation.navigate("securitySetup", {
        setupToken: user.setupToken,
        email: user.email,
      });

      return;
    }
    if (user) {
      navigation.replace("dashboard");
    }
  }, [user, loading, navigation]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <Login {...props} />;
}

// --- Stack navigator ---
function StackNavWrapper() {
  const { loading, token } = useContext(AuthContext);

  if (loading) return null;

  return (
    <Stack.Navigator
      initialRouteName="login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" component={LoginWrapper} />
      <Stack.Screen name="dashboard" component={DrawerNav} />
      <Stack.Screen name="otpScreen" component={OTP} />
      <Stack.Screen name="securitySetup" component={SecuritySetup} />

      <Stack.Screen name="forgotPassword" component={ForgotPassword} />
      <Stack.Screen name="resetPassword" component={ResetPassword} />
    </Stack.Navigator>
  );
}

export default function App() {
  const linking = LinkingConfig;

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      text: "#000000",
      primary: "#26866F",
    },
    icons: {
      ...DefaultTheme.icons,
      icon: (props) => {
        if (!props.name) return null;
        return <MaterialCommunityIcons {...props} />;
      },
    },
  };

  return (
    <AuthProvider>
      <NotificationProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer linking={linking} ref={navigationRef}>
            <StackNavWrapper />
          </NavigationContainer>
        </PaperProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
