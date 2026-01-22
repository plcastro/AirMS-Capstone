import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";

export default function App() {
  const CScreen = createNativeStackNavigator();
  return (
    <NavigationContainer>
      <CScreen.Navigator initialRouteName="login">
        <CScreen.Screen
          name="login"
          component={Login}
          options={{ title: "AirMS", headerTitleAlign: "center" }}
        />
        <CScreen.Screen
          name="forgotPassword"
          component={ForgotPassword}
          options={{ title: "AirMS", headerTitleAlign: "center" }}
        />
        <CScreen.Screen
          name="resetPassword"
          component={ResetPassword}
          options={{ title: "AirMS", headerTitleAlign: "center" }}
        />
      </CScreen.Navigator>
    </NavigationContainer>
  );
}
