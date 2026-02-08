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
import AlertComp from "./AlertComp";
import { API_BASE } from "../utilities/API_BASE";

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
    role: ["Head of Maintenance"],
  },
  {
    icon: "sort",
    label: "Priority Sorting",
    navigateTo: "Priority Sorting",
    role: ["Head of Maintenance"],
  },
  {
    icon: "chart-arc",
    label: "Report and Analytics",
    navigateTo: "Reports And Analytics",
    role: ["Head of Maintenance", "Manager"],
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
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const userRole = user?.role?.toLowerCase(); // normalize role
  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

  // Track which parent menu is open
  useEffect(() => {
    DrawerList.forEach((item) => {
      if (item.children?.some((c) => c.navigateTo === activeRoute)) {
        setOpenMenu(item.label);
      }
    });
  }, [activeRoute]);

  const handleLogout = async () => {
    try {
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

      if (!rememberMeFlag || rememberMeFlag === "false") {
        await AsyncStorage.multiRemove([
          "rememberedIdentifier",
          "rememberedPassword",
        ]);
        await AsyncStorage.setItem("rememberMe", "false");
      }

      logoutUser();
      nav.replace("login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  // Role-based filtering
  const isItemVisible = (item) => {
    const itemRoles = item.role?.map((r) => r.toLowerCase()) || [];
    if (!itemRoles.length) return true;
    return itemRoles.includes(userRole);
  };

  const getChildren = (item) => {
    if (!item.children) return [];

    return item.children
      .filter((child) => {
        switch (userRole) {
          case "Pilot":
            return child.label === "Flight Logbook"; // ONLY flight log
          case "Head of Maintenance":
          case "Manager":
            return (
              child.label === "Flight Logbook" ||
              child.label === "Maintenance Logbook"
            );
          default:
            return true; // Admin, Mechanic see all allowed
        }
      })
      .map((child) => {
        return {
          ...child,
          readOnly:
            (userRole === "Head of Maintenance" || userRole === "Manager") &&
            child.label === "Flight Logbook",
        };
      });
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
            marginBottom: 10,
          }}
        />

        <View style={styles.drawerSection}>
          {DrawerList.filter(isItemVisible).map((item, index) => {
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

                {item.children &&
                  openMenu === item.label &&
                  getChildren(item).map((child, i) => {
                    const childActive = activeRoute === child.navigateTo;
                    return (
                      <DrawerItem
                        key={i}
                        label={
                          child.readOnly
                            ? `${child.label} (Read-only)`
                            : child.label
                        }
                        focused={childActive}
                        style={{
                          backgroundColor: childActive
                            ? "#26866F"
                            : "transparent",
                          borderRadius: 0,
                        }}
                        labelStyle={{ color: childActive ? "#fff" : "#777" }}
                        onPress={() => {
                          if (!child.readOnly) {
                            navigation.dispatch(
                              CommonActions.navigate({
                                name: child.navigateTo,
                              }),
                            );
                          }
                        }}
                      />
                    );
                  })}
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
          onPress={() => setShowLogoutAlert(true)}
        />
      </View>

      {showLogoutAlert && (
        <AlertComp
          visible={showLogoutAlert}
          title="Confirm Logout"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          onConfirm={() => {
            setShowLogoutAlert(false);
            handleLogout();
          }}
          onCancel={() => setShowLogoutAlert(false)}
        />
      )}
    </SafeAreaView>
  );
}

export default DrawerContent;
