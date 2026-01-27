import React from "react";
import { Platform, Image } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator, DrawerActions } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Entypo";

import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import Dashboard from "./screens/Dashboard";
import Profile from "./screens/Profile";
import DrawerContent from "./components/DrawerContent";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer navigator for main app screens
function DrawerNav() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: Platform.OS !== "web",
        drawerType: Platform.OS === "web" ? "permanent" : "front",
        swipeEnabled: Platform.OS !== "web",
        drawerStyle: Platform.OS === "web" ? { width: 260 } : {},
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={Dashboard}
        options={({ navigation }) => ({
          headerLeft:
            Platform.OS !== "web"
              ? () => (
                  <Icon
                    name="menu"
                    size={30}
                    color="#26866F"
                    style={{ marginLeft: 20 }}
                    onPress={() =>
                      navigation.dispatch(DrawerActions.toggleDrawer())
                    }
                  />
                )
              : null,
        })}
      />
      <Drawer.Screen name="Profile" component={Profile} />
    </Drawer.Navigator>
  );
}

// Stack navigator for login + main app
function StackNav() {
  return (
    <Stack.Navigator initialRouteName="login">
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
        name="main"
        component={DrawerNav}
        options={{ headerShown: false }} // drawer will handle headers
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StackNav />
    </NavigationContainer>
  );
}
