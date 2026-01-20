import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import Login from "./screens/Login";
export default function App() {
  const CScreen = createNativeStackNavigator();
  return (
    <NavigationContainer>
      <CScreen.Navigator initialRouteName="login">
        <CScreen.Screen
          name="login"
          component={Login}
          options={{ title: "" }}
        />
      </CScreen.Navigator>
    </NavigationContainer>
  );
}
