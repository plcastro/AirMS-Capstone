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
import Profile from "./screens/Settings/Profile";

import FlightLog from "./screens/Main/FlightLog";
import TaskAssignment from "./screens/Main/TaskAssignment";
import PreInspection from "./screens/Main/PreInspection";
import PostInspection from "./screens/Main/PostInspection";
import PartsRequisition from "./screens/Main/PartsRequisition";
import Messaging from "./screens/Main/Messaging";

import DrawerContent from "./components/DrawerContent";
import useResponsiveWeb from "./Layout/useResponsiveWeb";
import LinkingConfig from "./utilities/LinkingConfig";
import { API_BASE } from "./utilities/API_BASE";
import OTP from "./screens/Auth/OTP";
import LoadingScreen from "./screens/LoadingScreen";
import MechanicList from "./screens/Main/MechanicList";
import NotificationBell from "./components/Notifications/NotificationBell";
import { navigationRef } from "./utilities/navigationRef";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNav({ navigation }) {
  const { user, loading } = useContext(AuthContext);
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

  const wrapWithDashboard = (ScreenComponent) => (props) => (
    <Dashboard>
      <ScreenComponent {...props} />
    </Dashboard>
  );
  const navLabel = {
    headerTitleStyle: {
      fontSize: 14,
      fontWeight: 200,
    },
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
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
      {[
        "maintenance manager",
        "pilot",
        "officer-in-charge",
        "mechanic",
      ].includes(user.jobTitle?.toLowerCase()) && (
        <>
          <Drawer.Screen
            name="Flight Logbook"
            component={wrapWithDashboard(FlightLog)}
            options={navLabel}
          />
          <Drawer.Screen
            name="Pre-Inspection"
            component={wrapWithDashboard(PreInspection)}
            options={navLabel}
          />
          <Drawer.Screen
            name="Post-Inspection"
            component={wrapWithDashboard(PostInspection)}
            options={navLabel}
          />
        </>
      )}

      {user.jobTitle?.toLowerCase() === "maintenance manager" && (
        <Drawer.Screen
          name="Mechanics"
          component={wrapWithDashboard(MechanicList)}
          options={navLabel}
        />
      )}

      {["maintenance manager", "mechanic"].includes(
        user.jobTitle?.toLowerCase(),
      ) && (
        <>
          <Drawer.Screen
            name="Tasks"
            component={wrapWithDashboard(TaskAssignment)}
            options={navLabel}
          />
        </>
      )}

      {["maintenance manager", "mechanic", "officer-in-charge"].includes(
        user.jobTitle?.toLowerCase(),
      ) && (
        <Drawer.Screen
          name="Parts Requisition"
          component={wrapWithDashboard(PartsRequisition)}
          options={navLabel}
        />
      )}
      {[
        "maintenance manager",
        "mechanic",
        "officer-in-charge",
        "pilot",
      ].includes(user.jobTitle?.toLowerCase()) && (
        <Drawer.Screen
          name="Messages"
          component={wrapWithDashboard(Messaging)}
          options={navLabel}
        />
      )}
      {[
        "maintenance manager",
        "mechanic",
        "officer-in-charge",
        "pilot",
      ].includes(user.jobTitle?.toLowerCase()) && (
        <Drawer.Screen
          name="Profile"
          component={wrapWithDashboard(Profile)}
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
    if (user.jobTitle === "Admin") {
      return;
    }

    if (user.status === "inactive") {
      console.log(user.setupToken);
      navigation.navigate("securitySetup", {
        setupToken: user.token,
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
  const optionsMain = {
    headerShown: true,
    title: "",
    headerTitleAlign: "center",
    headerTitle: () => (
      <Image
        source={require("./assets/AirMS_web.png")}
        style={{ width: 150, height: 50 }}
      />
    ),
  };

  const { loading } = useContext(AuthContext);

  if (loading) return null;

  return (
    <Stack.Navigator initialRouteName="login">
      <Stack.Screen
        name="login"
        component={LoginWrapper}
        options={optionsMain}
      />
      <Stack.Screen name="otpScreen" component={OTP} options={optionsMain} />
      <Stack.Screen
        name="securitySetup"
        component={SecuritySetup}
        options={optionsMain}
      />
      <Stack.Screen
        name="dashboard"
        component={DrawerNav}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="forgotPassword"
        component={ForgotPassword}
        options={optionsMain}
      />
      <Stack.Screen
        name="resetPassword"
        component={ResetPassword}
        options={optionsMain}
      />
    </Stack.Navigator>
  );
}

function AppShell({ linking }) {
  const {
    recordActivity,
    showSessionTimeoutWarning,
    warningSecondsRemaining,
    continueSession,
    logoutUser,
  } = useContext(AuthContext);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        recordActivity?.();
        return false;
      }}
    >
      <NavigationContainer
        linking={linking}
        ref={navigationRef}
        onStateChange={() => recordActivity?.()}
      >
        <StackNavWrapper />
      </NavigationContainer>
      <Modal
        transparent
        animationType="fade"
        visible={showSessionTimeoutWarning}
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
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 10 }}>
              Session Timeout Warning
            </Text>
            <Text style={{ fontSize: 12, color: "#333", marginBottom: 8 }}>
              You&apos;ve been inactive for a while. For your security,
              you&apos;ll be signed out in 2 minutes unless you continue.
            </Text>
            <Text style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
              Auto sign-out in {warningSecondsRemaining} seconds.
            </Text>
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
                <Text style={{ color: "#333" }}>Sign out now</Text>
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
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Continue session
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export default function App() {
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

  return (
    <AuthProvider>
      <NotificationProvider>
        <PaperProvider theme={theme}>
          <AppShell linking={linking} />
        </PaperProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
