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
  // {
  //   icon: "account-group",
  //   label: "User Management",
  //   navigateTo: "User Management",
  //   position: ["admin"],
  //   children: [
  //     { label: "Manage Users", navigateTo: "User Management" },
  //     { label: "User Logs", navigateTo: "User Logs" },
  //   ],
  // },
  {
    icon: "book-open-page-variant",
    label: "Aircraft Logbook",
    navigateTo: "Flight Logbook",
    position: ["pilot", "head of maintenance", "manager"],
    children: [
      { label: "Flight Logbook", navigateTo: "Flight Logbook" },
      { label: "Maintenance Logbook", navigateTo: "Maintenance Logbook" },
    ],
  },
  // {
  //   icon: "cog-outline",
  //   label: "Parts Monitoring",
  //   position: ["head of maintenance", "manager"],
  //   children: [
  //     { label: "Parts Monitoring Table", navigateTo: "Parts Monitoring" },
  //     { label: "Track Maintenance", navigateTo: "Track Maintenance" },
  //   ],
  // },
  // {
  //   icon: "archive-outline",
  //   label: "Component Inventory",
  //   navigateTo: "Component Inventory",
  //   position: ["head of maintenance"],
  // },
  // {
  //   icon: "sort-variant",
  //   label: "Priority Sorting",
  //   navigateTo: "Priority Sorting",
  //   position: ["head of maintenance"],
  // },
  // {
  //   icon: "chart-arc",
  //   label: "Reports and Analytics",
  //   navigateTo: "Reports and Analytics",
  //   position: ["head of maintenance", "manager"],
  // },
  {
    icon: "clipboard-text",
    label: "Tasks",
    navigateTo: "Tasks",
    position: ["head of maintenance", "mechanic"],
  },
  {
    icon: "account-circle",
    label: "My Profile",
    navigateTo: "Profile",
    position: ["admin", "pilot", "head of maintenance", "manager", "mechanic"],
  },
];

function DrawerContent({ navigation }) {
  const nav = useNavigation();
  const { user, logoutUser } = useContext(AuthContext);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const userPosition = user?.position?.toLowerCase();
  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

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

  const isItemVisible = (item) => {
    const positions = item.position?.map((p) => p.toLowerCase()) || [];
    return positions.length === 0 || positions.includes(userPosition);
  };

  const getChildren = (item) => {
    if (!item.children) return [];
    return item.children.filter((child) => {
      switch (userPosition) {
        case "pilot":
          return child.label === "Flight Logbook";
        case "head of maintenance":
        case "manager":
          return ["Flight Logbook", "Maintenance Logbook"].includes(
            child.label,
          );
        default:
          return true;
      }
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
                  icon={({ color, size }) => (
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
                        label={child.label}
                        focused={childActive}
                        style={{
                          backgroundColor: childActive
                            ? "#26866F"
                            : "transparent",
                          borderRadius: 0,
                        }}
                        labelStyle={{
                          color: childActive ? "#fff" : "#777",
                          paddingLeft: 20,
                        }}
                        onPress={() =>
                          navigation.dispatch(
                            CommonActions.navigate({ name: child.navigateTo }),
                          )
                        }
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
          style={{ borderRadius: 0 }}
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
