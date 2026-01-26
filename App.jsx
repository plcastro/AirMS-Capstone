import "react-native-gesture-handler";
import "react-native-reanimated";
import {
  DrawerActions,
  NavigationContainer,
  useNavigation,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import { Image, Platform } from "react-native";
import Login from "./screens/Login";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import Dashboard from "./screens/Dashboard";
import Profile from "./screens/Profile";
import Icon from "react-native-vector-icons/Entypo";
import DrawerContent from "./components/DrawerContent";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNav() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: Platform.OS !== "web",
        drawerType: Platform.OS === "web" ? "permanent" : "front",
        swipeEnabled: Platform.OS !== "web",
        drawerStyle: Platform.OS === "web" ? { width: 250 } : {},
      }}
    >
      <Drawer.Screen name="dashboard" component={Dashboard} />
      <Drawer.Screen name="profile" component={Profile} />
    </Drawer.Navigator>
  );
}
function StackNav() {
  const navigation = useNavigation();
  return (
    <Stack.Navigator initialRouteName="login">
      <Stack.Screen
        name="login"
        component={Login}
        options={{
          headerShown: true,
          title: "",
          headerTitleAlign: "center",
          headerTitle: () => {
            return (
              <Image
                source={require("./assets/AirMS_web.png")}
                style={{ height: 50, width: 150 }}
              />
            );
          },
        }}
      />
      <Stack.Screen
        name="forgotPassword"
        component={ForgotPassword}
        options={{
          headerShown: true,
          title: "",
          headerTitleAlign: "center",
          headerTitle: () => {
            return (
              <Image
                source={require("./assets/AirMS_web.png")}
                style={{ height: 50, width: 150 }}
              />
            );
          },
        }}
      />
      <Stack.Screen
        name="main"
        component={DrawerNav}
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
          headerShown: Platform.OS !== "web",
        })}
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
