import React, { useState, useContext } from "react";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { View, Image, Text } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AirMSWeb from "../assets/AirMS_web.png";
import AlertComp from "./AlertComp";
import { AuthContext } from "../Context/AuthContext";

const DrawerList = [
  {
    label: "GENERAL",
    jobTitle: [
      "admin",
      "maintenance manager",
      "officer-in-charge",
      "warehouse department",
      "mechanic",
    ],
    children: [
      {
        icon: "chart-areaspline",
        label: "Reports and Analytics",
        navigateTo: "Reports and Analytics",
        jobTitle: ["admin", "maintenance manager", "officer-in-charge"],
      },
      {
        icon: "message-text-outline",
        label: "Messages",
        navigateTo: "Messages",
        jobTitle: [
          "admin",
          "maintenance manager",
          "mechanic",
          "pilot",
          "officer-in-charge",
          "warehouse department",
        ],
      },
    ],
  },
  {
    label: "USER MANAGEMENT",
    jobTitle: ["admin"],
    children: [
      {
        icon: "account-multiple-outline",
        label: "Manage Users",
        navigateTo: "Manage Users",
        jobTitle: ["admin"],
      },
      {
        icon: "history",
        label: "Activity Logs",
        navigateTo: "Activity Logs",
        jobTitle: ["admin"],
      },
    ],
  },
  {
    label: "AIRCRAFT HEALTH LOGBOOK",
    jobTitle: [
      "admin",
      "pilot",
      "maintenance manager",
      "officer-in-charge",
      "mechanic",
    ],
    children: [
      {
        icon: "helicopter",
        label: "Flight Logs",
        navigateTo: "Flight Logs",
        jobTitle: [
          "admin",
          "pilot",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
      {
        icon: "tools",
        label: "Maintenance Logs",
        navigateTo: "Maintenance Logs",
        jobTitle: [
          "admin",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
      {
        icon: "clipboard-check-outline",
        label: "Pre-Inspection",
        navigateTo: "Pre-Inspection",
        jobTitle: [
          "admin",
          "pilot",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
      {
        icon: "clipboard-check-outline",
        label: "Post-Inspection",
        navigateTo: "Post-Inspection",
        jobTitle: [
          "admin",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
    ],
  },
  {
    label: "TASK ASSIGNMENT & MONITORING",
    jobTitle: ["admin", "maintenance manager", "mechanic"],
    children: [
      {
        icon: "calendar-clock",
        label: "Tasks",
        navigateTo: "Tasks",
        jobTitle: ["admin", "maintenance manager", "mechanic"],
      },
      {
        icon: "account-group",
        label: "Mechanics",
        navigateTo: "Mechanics",
        jobTitle: ["admin", "maintenance manager"],
      },
    ],
  },
  {
    label: "PARTS LIFESPAN & MAINTENANCE TRACKING",
    jobTitle: ["admin", "maintenance manager", "officer-in-charge"],
    children: [
      {
        icon: "view-dashboard-outline",
        label: "Parts Lifespan Monitoring",
        navigateTo: "Parts Lifespan Monitoring",
        jobTitle: ["admin", "maintenance manager", "officer-in-charge"],
      },
      {
        icon: "radar",
        label: "Maintenance Tracking",
        navigateTo: "Maintenance Tracking",
        jobTitle: ["admin", "maintenance manager", "officer-in-charge"],
      },
      {
        icon: "flag-outline",
        label: "Maintenance Priority Sorting",
        navigateTo: "Maintenance Priority Sorting",
        jobTitle: ["admin", "maintenance manager"],
      },
    ],
  },
  {
    label: "PARTS REQUISITION",
    jobTitle: [
      "admin",
      "warehouse department",
      "maintenance manager",
      "officer-in-charge",
      "mechanic",
    ],
    children: [
      {
        icon: "inbox-outline",
        label: "Parts Requisition Monitoring",
        navigateTo: "Parts Requisition",
        jobTitle: [
          "admin",
          "warehouse department",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
    ],
  },
  {
    label: "SETTINGS",
    jobTitle: [
      "admin",
      "maintenance manager",
      "mechanic",
      "officer-in-charge",
      "warehouse department",
    ],
    children: [
      {
        icon: "account-circle",
        label: "Profile",
        navigateTo: "Profile",
        jobTitle: [
          "admin",
          "maintenance manager",
          "mechanic",
          "officer-in-charge",
          "warehouse department",
        ],
      },
    ],
  },
];

function DrawerContent({ navigation }) {
  const nav = useNavigation();
  const { user, logoutUser } = useContext(AuthContext);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const userJob = user?.jobTitle?.toLowerCase();

  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

  const isVisible = (item) => {
    const roles = item.jobTitle?.map((r) => r.toLowerCase()) || [];
    return roles.length === 0 || roles.includes(userJob);
  };

  const getChildren = (item) =>
    item.children ? item.children.filter(isVisible) : [];

  const handleLogout = async () => {
    try {
      await logoutUser({ notifyServer: true });
      nav.replace("login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DrawerContentScrollView>
        <Image
          source={AirMSWeb}
          style={{
            width: 120,
            height: 40,
            alignSelf: "center",
            marginBottom: 10,
          }}
        />

        <View>
          {DrawerList.filter(isVisible).map((item) => {
            const isActive =
              (!item.children && item.navigateTo === activeRoute) ||
              (item.children &&
                item.children.some((c) => c.navigateTo === activeRoute));

            if (item.children) {
              return (
                <View key={item.label} style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: "#777",
                      marginLeft: 18,
                      marginBottom: 2,
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </Text>
                  {getChildren(item).map((child) => {
                    const childActive = activeRoute === child.navigateTo;

                    return (
                      <DrawerItem
                        key={child.navigateTo}
                        focused={childActive}
                        style={{
                          backgroundColor: childActive
                            ? "#E6F4F1"
                            : "transparent",
                          borderRadius: 10,
                          borderLeftWidth: childActive ? 4 : 0,
                          borderLeftColor: "#26866F",
                        }}
                        label={() => (
                          <Text
                            style={{
                              color: childActive ? "#26866F" : "#777",
                              fontSize: 12,
                              fontWeight: childActive ? "600" : "400",
                            }}
                            numberOfLines={2}
                          >
                            {child.label}
                          </Text>
                        )}
                        icon={({ size }) => (
                          <MaterialCommunityIcons
                            name={child.icon}
                            size={size}
                            color={childActive ? "#26866F" : "#777"}
                          />
                        )}
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
              );
            }

            return (
              <View key={item.label}>
                <DrawerItem
                  focused={isActive}
                  style={{
                    backgroundColor: isActive ? "#E6F4F1" : "transparent",
                    borderRadius: 10,
                    borderLeftWidth: isActive ? 4 : 0,
                    borderLeftColor: "#26866F",
                  }}
                  label={() => (
                    <Text
                      style={{
                        color: isActive ? "#26866F" : "#777",
                        fontSize: 12,
                        fontWeight: isActive ? "600" : "400",
                      }}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                  )}
                  icon={({ size }) => (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={size}
                      color={isActive ? "#26866F" : "#777"}
                    />
                  )}
                  onPress={() => {
                    if (!item.children) {
                      navigation.dispatch(
                        CommonActions.navigate({ name: item.navigateTo }),
                      );
                    }
                  }}
                />
              </View>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* LOGOUT */}
      <View style={{ padding: 10 }}>
        <DrawerItem
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="exit-to-app"
              size={size}
              color={color}
            />
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
