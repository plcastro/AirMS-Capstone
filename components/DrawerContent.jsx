import React, { useState, useEffect, useContext } from "react";
import { CommonActions, useNavigation } from "@react-navigation/native";
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
    role: ["Admin"],
    children: [
      { label: "Manage Users", navigateTo: "User Management" },
      { label: "User Logs", navigateTo: "User Logs" },
    ],
  },
  {
    icon: "book",
    label: "Aircraft Logbook",
    navigateTo: "Flight Logbook",
    role: ["Pilot", "Head of Maintenance", "Manager"],
    children: [
      { label: "Flight Logbook", navigateTo: "Flight Logbook" },
      { label: "Maintenance Logbook", navigateTo: "Maintenance Logbook" },
    ],
  },
  {
    icon: "account",
    label: "Parts Monitoring",
    role: ["Head of Maintenance", "Manager"],
    children: [
      { label: "Parts Monitoring Table", navigateTo: "PartsMonitoring" },
      { label: "Track Maintenance", navigateTo: "TrackMaintenance" },
    ],
  },
  {
    icon: "book",
    label: "Component Inventory",
    navigateTo: "Component Inventory",
    role: ["Head of Maintenance", "Manager"],
  },
  {
    icon: "sort",
    label: "Priority Sorting",
    navigateTo: "Priority Sorting",
    role: ["Head of Maintenance", "Manager"],
  },
  {
    icon: "chart-arc",
    label: "Report and Analytics",
    navigateTo: "Reports And Analytics",
    role: ["Pilot", "Head of Maintenance", "Manager"],
  },
  {
    icon: "account",
    label: "My Profile",
    navigateTo: "Profile",
    role: ["Admin", "Pilot", "Head of Maintenance", "Manager", "mechanic"],
  },
];

function DrawerContent({ navigation }) {
  const nav = useNavigation();
  const { user, logoutUser } = useContext(AuthContext);
  const userRole = user?.role?.toLowerCase(); // normalize role
  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    DrawerList.forEach((item) => {
      if (item.children?.some((c) => c.navigateTo === activeRoute)) {
        setOpenMenu(item.label);
      }
    });
  }, [activeRoute]);

  // Filter drawer items based on role and platform
  const filteredDrawerList = DrawerList.filter((item) => {
    const itemRoles = item.role?.map((r) => r.toLowerCase()) || [];
    const isRoleAllowed = !itemRoles.length || itemRoles.includes(userRole);

    if (Platform.OS !== "web") {
      // Mobile: only show logbook items or My Profile
      const isLogbook = item.label === "Aircraft Logbook";
      const isProfile = item.label === "My Profile";
      return (isLogbook && isRoleAllowed) || isProfile;
    }

    // Web: show items permitted by role
    return isRoleAllowed;
  });

  const handleLogout = async () => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      const token = await AsyncStorage.getItem("currentUserToken");
      if (token) {
        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }

      await AsyncStorage.multiRemove(["currentUser", "currentUserToken"]);

      const rememberMeFlag = await AsyncStorage.getItem("rememberMe");
      if (rememberMeFlag === "false" || rememberMeFlag === null) {
        await AsyncStorage.multiRemove([
          "rememberedIdentifier",
          "rememberedPassword",
        ]);
        await AsyncStorage.setItem("rememberMe", "false");
      }
      nav.replace("login");
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
          style={{ width: 150, height: 50, alignSelf: "center" }}
        />

        <View style={styles.drawerSection}>
          {filteredDrawerList.map((item, index) => {
            const isActive =
              (!item.children && item.navigateTo === activeRoute) ||
              (item.children &&
                item.children.some((c) => c.navigateTo === activeRoute));

            return (
              <View key={index}>
                <DrawerItem
                  label={item.label}
                  focused={isActive}
                  style={{
                    backgroundColor: isActive ? "#26866F" : "transparent",
                    borderRadius: 0,
                  }}
                  labelStyle={{ color: isActive ? "#fff" : "#777" }}
                  icon={({ size }) => (
                    <Icon
                      name={
                        item.children
                          ? openMenu === item.label
                            ? "chevron-down"
                            : "chevron-right"
                          : item.icon
                      }
                      color={isActive ? "#fff" : "#777"}
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
                          labelStyle={{ color: childActive ? "#fff" : "#777" }}
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
          onPress={handleLogout}
        />
      </View>
    </SafeAreaView>
  );
}

export default DrawerContent;
