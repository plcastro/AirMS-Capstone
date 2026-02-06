import React, { useState, useEffect, useContext } from "react";
import { CommonActions } from "@react-navigation/native";
import { View, Image, Platform } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../stylesheets/styles";
import AirMSWeb from "../assets/AirMS_web.png";
import { AuthContext } from "../Context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
const DrawerList = [
  {
    icon: "account-group",
    label: "User Management",
    navigateTo: "User Management",
    access: ["admin"],
    children: [
      { label: "Manage Users", navigateTo: "User Management" },
      { label: "User Logs", navigateTo: "User Logs" },
    ],
  },

  {
    icon: "book",
    label: "Aircraft Logbook",
    navigateTo: "Flight Logbook",
    children: [
      {
        label: "Flight Logbook",
        navigateTo: "Flight Logbook",
      },
      { label: "Maintenance Logbook", navigateTo: "Maintenance Logbook" },
    ],
    access: ["superuser"],
  },

  {
    icon: "account",
    label: "Parts Monitoring",
    access: ["superuser"],
    children: [
      { label: "Parts Monitoring Table", navigateTo: "PartsMonitoring" },
      { label: "Track Maintenance", navigateTo: "TrackMaintenance" },
    ],
  },

  {
    icon: "book",
    label: "Component Inventory",
    navigateTo: "Component Inventory",
    access: ["superuser"],
  },
  {
    icon: "sort",
    label: "Priority Sorting",
    navigateTo: "Priority Sorting",
    access: ["superuser"],
  },
  {
    icon: "chart-arc",
    label: "Report and Analytics",
    navigateTo: "Reports And Analytics",
    access: ["superuser"],
  },
  {
    icon: "account",
    label: "My Profile",
    navigateTo: "Profile",
    access: ["admin", "superuser", "user"],
  },
];

function DrawerContent({ navigation }) {
  const { user, logoutUser } = useContext(AuthContext);
  const userRole = user?.role;
  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

  const [openMenu, setOpenMenu] = useState(null);

  // Auto-open parent if a child route is active
  useEffect(() => {
    DrawerList.forEach((item) => {
      if (item.children?.some((c) => c.navigateTo === activeRoute)) {
        setOpenMenu(item.label);
      }
    });
  }, [activeRoute]);

  const filteredDrawerList = DrawerList.filter((item) => {
    if (item.access && !item.access.includes(userRole)) return false;

    // Mobile: only show Profile + Logbooks
    if (Platform.OS !== "web") {
      return (
        item.navigateTo === "Profile" ||
        item.navigateTo === "Flight Logbook" ||
        item.navigateTo === "Maintenance Logbook" ||
        item.children?.some(
          (child) =>
            child.navigateTo === "Flight Logbook" ||
            child.navigateTo === "Maintenance Logbook",
        )
      );
    }

    // Web: show everything
    return true;
  });

  const handleLogout = async () => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      // call API to logout
      await fetch(`${API_BASE}/api/user/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await AsyncStorage.getItem("currentUserToken")}`,
        },
      });

      // clear AsyncStorage
      await AsyncStorage.multiRemove(["currentUser", "currentUserToken"]);

      const rememberMeFlag = await AsyncStorage.getItem("rememberMe");
      if (rememberMeFlag === "false" || rememberMeFlag === null) {
        await AsyncStorage.removeItem("rememberedIdentifier");
        await AsyncStorage.removeItem("rememberedPassword");
        await AsyncStorage.setItem("rememberMe", "false"); // reset flag
      }

      // trigger conditional rendering in App: this will show login screen
      logoutUser();
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DrawerContentScrollView>
        <Image
          source={AirMSWeb}
          style={{
            width: 150,
            height: 50,
            alignSelf: "center",
          }}
        />

        <View style={styles.drawerSection}>
          {filteredDrawerList.map((item, index) => {
            const activeRoute =
              navigation.getState().routes[navigation.getState().index].name;
            const isActive = !item.children && item.navigateTo === activeRoute;

            return (
              <View key={index}>
                <DrawerItem
                  label={item.label}
                  focused={isActive}
                  style={{
                    backgroundColor: isActive ? "#26866F" : "transparent",
                    borderRadius: 0,
                  }}
                  labelStyle={{
                    color: isActive ? "#ffffff" : "#777",
                  }}
                  icon={({ size }) => (
                    <Icon
                      name={
                        item.children
                          ? openMenu === item.label
                            ? "chevron-down"
                            : "chevron-right"
                          : item.icon
                      }
                      color={isActive ? "#ffffff" : "#777"}
                      size={size}
                    />
                  )}
                  onPress={() => {
                    if (item.children) {
                      setOpenMenu(openMenu === item.label ? null : item.label);
                    } else {
                      navigation.dispatch(
                        CommonActions.navigate({ name: item.navigateTo }),
                      );
                    }
                  }}
                />

                {item.children && openMenu === item.label && (
                  <View>
                    {item.children.map((child, i) => {
                      const childActive = activeRoute === child.navigateTo;

                      return (
                        <DrawerItem
                          key={i}
                          label={child.label}
                          focused={childActive}
                          style={{
                            backgroundColor: childActive
                              ? "#26866F"
                              : "transparent",
                            borderRadius: 0,
                          }}
                          labelStyle={{
                            color: childActive ? "#ffffff" : "#777",
                          }}
                          onPress={() =>
                            navigation.dispatch(
                              CommonActions.navigate({
                                name: child.navigateTo,
                              }),
                            )
                          }
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={styles.bottomDrawerSection}>
        <DrawerItem
          icon={({ color, size }) => (
            <Icon name="exit-to-app" color={color} size={size} />
          )}
          label="Log Out"
          onPress={() => handleLogout()}
        />
      </View>
    </SafeAreaView>
  );
}

export default DrawerContent;
