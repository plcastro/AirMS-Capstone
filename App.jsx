import React, { useContext } from "react";
import { Platform, Image, TouchableOpacity, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Entypo";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";

import { AuthProvider, AuthContext } from "./Context/AuthContext";

import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import SecuritySetup from "./screens/SecuritySetup";
import Dashboard from "./Layout/Dashboard";
import Profile from "./screens/Profile";
import PartsMonitoring from "./screens/PartsMonitoring";
import UserManagement from "./screens/UserManagement";
import UserLogs from "./screens/UserLogs";
import FlightLog from "./screens/FlightLog";
import MaintenanceLog from "./screens/MaintenanceLog";
import DrawerContent from "./components/DrawerContent";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer navigator
function DrawerNav() {
  const { user, loading } = useContext(AuthContext);
  const isWeb = Platform.OS === "web";

  if (loading || !user) return null; // prevent drawer rendering until user is ready

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
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 10,
            }}
            onPress={() => navigation.navigate("Profile")}
          >
            <Image
              source={{
                uri: "https://static.vecteezy.com/system/resources/previews/022/036/297/non_2x/doraemon-cartoon-japanese-free-vector.jpg",
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 5,
              }}
            />
            <View style={{ flexDirection: "column" }}>
              <Text>{user?.firstName || ""}</Text>
              <Text>{user?.access || ""}</Text>
            </View>
          </TouchableOpacity>
        ),
      })}
    >
      {user.role === "admin" && (
        <>
          <Drawer.Screen
            name="User Management"
            component={wrapWithDashboard(UserManagement)}
          />
          <Drawer.Screen
            name="User Logs"
            component={wrapWithDashboard(UserLogs)}
          />
        </>
      )}

      {["pilot", "head of maintenance", "manager"].includes(user.role) && (
        <>
          <Drawer.Screen
            name="Flight Logbook"
            component={wrapWithDashboard(FlightLog)}
          />
          <Drawer.Screen
            name="Maintenance Logbook"
            component={wrapWithDashboard(MaintenanceLog)}
          />
        </>
      )}

      <Drawer.Screen name="Profile" component={wrapWithDashboard(Profile)} />

      {["head of maintenance", "manager"].includes(user.role) && (
        <Drawer.Screen
          name="Parts Monitoring"
          component={wrapWithDashboard(PartsMonitoring)}
        />
      )}
    </Drawer.Navigator>
  );
}

// Stack navigator with auth check
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
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; // or a splash/loading screen

  return (
    <Stack.Navigator>
      {!user && (
        <>
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
        </>
      )}
      {user && (
        <Stack.Screen
          name="dashboard"
          component={DrawerNav}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

// Main App
export default function App() {
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, text: "#000000", primary: "#26866F" },
  };

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StackNavWrapper />
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}
