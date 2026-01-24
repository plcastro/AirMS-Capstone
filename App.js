import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Image, Text } from "react-native";
import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import AirMSWeb from "./assets/AirMS_web.png";
import Dashboard from "./screens/Dashboard";
export default function App() {
  const CScreen = createNativeStackNavigator();
  return (
    <NavigationContainer>
      <CScreen.Navigator
        initialRouteName="login"
        options={{ headerTransparent: true }}
      >
        <CScreen.Screen
          name="login"
          component={Login}
          options={{
            headerTitleAlign: "center",
            headerTitle: () => {
              return (
                <Image source={AirMSWeb} style={{ height: 50, width: 150 }} />
              );
            },
          }}
        />
        <CScreen.Screen
          name="forgotPassword"
          component={ForgotPassword}
          options={{
            headerTitleAlign: "center",
            headerTitle: () => {
              return (
                <Image source={AirMSWeb} style={{ height: 50, width: 150 }} />
              );
            },
          }}
        />
        <CScreen.Screen
          name="dashboard"
          component={Dashboard}
          options={{
            headerTransparent: true,
            title: "",
          }}
        />
      </CScreen.Navigator>
    </NavigationContainer>
  );
}
