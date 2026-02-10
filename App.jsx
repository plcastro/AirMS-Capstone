import React, { useContext, useEffect } from "react";
import { Platform, Image, TouchableOpacity, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import {
  Provider as PaperProvider,
  configureFonts,
  DefaultTheme,
} from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { AuthProvider, AuthContext } from "./Context/AuthContext";

import Login from "./screens/Auth/Login";
import ForgotPassword from "./screens/Auth/ForgotPassword";
import ResetPassword from "./screens/Auth/ResetPassword";
import SecuritySetup from "./screens/Auth/SecuritySetup";

import Dashboard from "./Layout/Dashboard";
import Profile from "./screens/Profile";

import UserManagement from "./screens/Admin/UserManagement";
import UserLogs from "./screens/Admin/UserLogs";

import FlightLog from "./screens/Main/FlightLog";
import MaintenanceLog from "./screens/Main/MaintenanceLog";
import PartsMonitoring from "./screens/Main/PartsMonitoring";

import DrawerContent from "./components/DrawerContent";
import useResponsiveWeb from "./Layout/useResponsiveWeb";
import LinkingConfig from "./utilities/LinkingConfig";
import { API_BASE } from "./utilities/API_BASE";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// --- Drawer navigator ---
function DrawerNav() {
  const { user, loading } = useContext(AuthContext);

  const profileImage =
    user.image && typeof user.image === "string"
      ? user.image.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image}`
      : `${API_BASE}/uploads/default_avatar.jpg`;
  const isWeb = Platform.OS === "web";
  const isWide = useResponsiveWeb();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  if (!user) return null; // user not logged in
  const wrapWithDashboard = (ScreenComponent) => (props) => (
    <Dashboard>
      <ScreenComponent {...props} />
    </Dashboard>
  );

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        drawerType: "slide",
        drawerStyle: { width: 260 },
        overlayColor: "transparent",
        headerRight: () => (
          <View style={{ marginHorizontal: 20 }}>
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
                  <Text style={{ fontSize: 14, fontWeight: "bold" }}>
                    {`${user.firstName} ${user.lastName}` || "User"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#777" }}>
                    {user?.position || ""}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ),
      })}
    >
      <Drawer.Screen
        name="User Management"
        component={wrapWithDashboard(UserManagement)}
      />
      <Drawer.Screen name="User Logs" component={wrapWithDashboard(UserLogs)} />
      <Drawer.Screen
        name="Flight Logbook"
        component={wrapWithDashboard(FlightLog)}
      />
      <Drawer.Screen
        name="Maintenance Logbook"
        component={wrapWithDashboard(MaintenanceLog)}
      />
      <Drawer.Screen
        name="Parts Monitoring"
        component={wrapWithDashboard(PartsMonitoring)}
      />
      <Drawer.Screen name="Profile" component={wrapWithDashboard(Profile)} />
    </Drawer.Navigator>
  );
}

// --- Login wrapper to redirect active users ---
function LoginWrapper({ navigation, ...props }) {
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (user.status === "deactivated") {
      return;
    }

    if (user.status === "inactive") {
      navigation.navigate("securitySetup", { email: user.email });
      return;
    }

    if (user.status === "active") {
      navigation.replace("dashboard");
    }
  }, [user, loading, navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
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

export default function App() {
  const linking = LinkingConfig;
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, text: "#000000", primary: "#26866F" },
    icons: {
      ...DefaultTheme.icons,
      icon: (props) => <MaterialCommunityIcons {...props} />,
    },
  };

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer linking={linking}>
          <StackNavWrapper />
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}
