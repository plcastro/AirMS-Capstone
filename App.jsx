import React, { useState, useEffect } from "react";
import { Platform, Image } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator, DrawerActions } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Dashboard from "./Layout/Dashboard";

import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import SecuritySetup from "./screens/SecuritySetup";

import Profile from "./screens/Profile";
import DrawerContent from "./components/DrawerContent";
import PartsMonitoring from "./screens/PartsMonitoring";
import UserManagement from "./screens/UserManagement";
import UserLogs from "./screens/UserLogs";
import FlightLog from "./screens/FlightLog";
import MaintenanceLog from "./screens/MaintenanceLog";

import { AuthProvider } from "./Context/AuthContext";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer navigator for main app screens
function DrawerNav() {
  const isWeb = Platform.OS === "web";
  const wrapWithDashboard = (ScreenComponent) => (props) => (
    <Dashboard>
      <ScreenComponent {...props} />
    </Dashboard>
  );

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: !isWeb,
        drawerType: isWeb ? "permanent" : "slide",
        swipeEnabled: !isWeb,
        drawerStyle: { width: 260 },
        overlayColor: "transparent",
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={Dashboard} // role-based main module already in Dashboard
        options={({ navigation }) => ({
          title: "",
          headerLeft: !isWeb
            ? () => (
                <Icon
                  name="menu"
                  size={30}
                  color="#26866F"
                  style={{ marginLeft: 20 }}
                  onPress={() => navigation.toggleDrawer()}
                />
              )
            : undefined,
        })}
      />
      {/* Other screens wrapped in Dashboard layout */}
      <Drawer.Screen
        name="User Management"
        component={wrapWithDashboard(UserManagement)}
      />
      <Drawer.Screen name="User Logs" component={wrapWithDashboard(UserLogs)} />
      <Drawer.Screen name="Profile" component={wrapWithDashboard(Profile)} />
      <Drawer.Screen
        name="Parts Monitoring"
        component={wrapWithDashboard(PartsMonitoring)}
      />
      <Drawer.Screen
        name="Flight Logbook"
        component={wrapWithDashboard(FlightLog)}
      />

      <Drawer.Screen
        name="Maintenance Logbook"
        component={wrapWithDashboard(MaintenanceLog)}
      />
    </Drawer.Navigator>
  );
}

// Stack navigator for login + main app
function StackNav() {
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
  return (
    <Stack.Navigator>
      <Stack.Screen name="login" component={Login} options={optionsMain} />
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
      <Stack.Screen
        name="securitySetup"
        component={SecuritySetup}
        options={optionsMain}
      />
      <Stack.Screen
        name="dashboard"
        component={DrawerNav}
        options={{ headerShown: false }} // drawer will handle headers
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, text: "#000000", primary: "#26866F" },
  };
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("currentUser");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  if (loading) return null; // or splash screen

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StackNav />
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}
