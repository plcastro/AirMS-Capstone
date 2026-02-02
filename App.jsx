import React, { useState, useEffect } from "react";
import { Platform, Image } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator, DrawerActions } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import Dashboard from "./screens/Dashboard";
import Profile from "./screens/Profile";
import DrawerContent from "./components/DrawerContent";
import PartsMonitoring from "./screens/PartsMonitoring";
import Logbook from "./screens/Logbook";
import UserManagement from "./screens/UserManagement";
import UserLogs from "./screens/UserLogs";

import { AuthContext } from "./Context/AuthContext";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer navigator for main app screens
function DrawerNav() {
  const isWeb = Platform.OS === "web";
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: !isWeb,
        drawerType: isWeb ? "permanent" : "slide",
        swipeEnabled: !isWeb,
        drawerStyle: !isWeb ? { width: 260 } : { width: 260 },
        overlayColor: "transparent",
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={Dashboard}
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
            : undefined, // remove on web
        })}
      />
      <Drawer.Screen name="User Management" component={UserManagement} />
      <Drawer.Screen name="User Logs" component={UserLogs} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="Parts Monitoring" component={PartsMonitoring} />
      <Drawer.Screen name="Logbook" component={Logbook} />
    </Drawer.Navigator>
  );
}

// Stack navigator for login + main app
function StackNav() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="login"
        component={Login}
        options={{
          headerShown: true,
          title: "",
          headerTitleAlign: "center",
          headerTitle: () => (
            <Image
              source={require("./assets/AirMS_web.png")}
              style={{ width: 150, height: 50 }}
            />
          ),
        }}
      />
      <Stack.Screen
        name="forgotPassword"
        component={ForgotPassword}
        options={{
          headerShown: true,
          title: "",
          headerTitleAlign: "center",
          headerTitle: () => (
            <Image
              source={require("./assets/AirMS_web.png")}
              style={{ width: 150, height: 50 }}
            />
          ),
        }}
      />
      <Stack.Screen
        name="resetPassword"
        component={ResetPassword}
        options={{
          headerShown: true,
          title: "",
          headerTitleAlign: "center",
          headerTitle: () => (
            <Image
              source={require("./assets/AirMS_web.png")}
              style={{ width: 150, height: 50 }}
            />
          ),
        }}
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
    <AuthContext.Provider value={{ user, setUser }}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StackNav />
        </NavigationContainer>
      </PaperProvider>
    </AuthContext.Provider>
  );
}
