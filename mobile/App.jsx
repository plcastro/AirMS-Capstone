import React, { useContext, useEffect } from "react";
import { Platform, Image, TouchableOpacity, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { AuthProvider, AuthContext } from "./Context/AuthContext";

import Login from "./screens/Auth/Login";
import ForgotPassword from "./screens/Auth/ForgotPassword";
import ResetPassword from "./screens/Auth/ResetPassword";
import SecuritySetup from "./screens/Auth/SecuritySetup";

import Dashboard from "./Layout/Dashboard";
import Profile from "./screens/Settings/Profile";

import FlightLog from "./screens/Main/FlightLog";
import TaskAssignment from "./screens/Main/TaskAssignment";
import HeadTaskScreen from "./screens/Main/HeadTaskScreen";
import PreInspection from "./screens/Main/PreInspection";
import PostInspection from "./screens/Main/PostInspection";
import PartsRequisition from "./screens/Main/PartsRequisition";

import DrawerContent from "./components/DrawerContent";
import useResponsiveWeb from "./Layout/useResponsiveWeb";
import LinkingConfig from "./utilities/LinkingConfig";
import { API_BASE } from "./utilities/API_BASE";
import OTP from "./screens/Auth/OTP";
import LoadingScreen from "./screens/LoadingScreen";
import MechanicTaskScreen from "./screens/Main/MechanicTaskScreen";
import MechanicList from "./screens/Main/MechanicList";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

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
    return <LoadingScreen />;
  }

  if (!user) return null;

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
          <View style={{ marginHorizontal: 7 }}>
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
        "mechanic",
        "officer-in-charge",
      ].includes(user.jobTitle?.toLowerCase()) && (
        <>
          <Drawer.Screen
            name="Flight Logbook"
            component={wrapWithDashboard(FlightLog)}
          />
          <Drawer.Screen
            name="Pre-Inspection"
            component={wrapWithDashboard(PreInspection)}
          />
          <Drawer.Screen
            name="Post-Inspection"
            component={wrapWithDashboard(PostInspection)}
          />
        </>
      )}

      {user.jobTitle?.toLowerCase() === "maintenance manager" && (
        <Drawer.Screen
          name="Mechanics"
          component={wrapWithDashboard(MechanicList)}
        />
      )}

      {["maintenance manager", "mechanic"].includes(
        user.jobTitle?.toLowerCase(),
      ) && (
        <>
          <Drawer.Screen
            name="Tasks"
            component={wrapWithDashboard(TaskAssignment)}
          />
        </>
      )}

      {["maintenance manager", "mechanic", "officer-in-charge"].includes(
        user.jobTitle?.toLowerCase(),
      ) && (
        <Drawer.Screen
          name="Parts Requisition"
          component={wrapWithDashboard(PartsRequisition)}
        />
      )}

      <Drawer.Screen name="Profile" component={wrapWithDashboard(Profile)} />
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
      <PaperProvider theme={theme}>
        <NavigationContainer linking={linking}>
          <StackNavWrapper />
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}
