import React, { useState, useContext } from "react";
import AppText from "./common/AppText";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { View, Image } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AirMSWeb from "../assets/AirMS_web.png";
import AlertComp from "./AlertComp";
import { AuthContext } from "../Context/AuthContext";
import { useFontScale } from "../Context/FontScaleContext";
import { hasNavAccess, resolveUserRole } from "../../shared/navigationAccess";

const DrawerList = [
  {
    label: "GENERAL",
    children: [
      {
        icon: "chart-areaspline",
        label: "Reports and Analytics",
        navigateTo: "Reports and Analytics",
        accessKey: "reports",
      },
      {
        icon: "message-text-outline",
        label: "Messages",
        navigateTo: "Messages",
        accessKey: "messages",
      },
    ],
  },
  {
    label: "USER MANAGEMENT",
    children: [
      {
        icon: "account-multiple-outline",
        label: "Manage Users",
        navigateTo: "Manage Users",
        accessKey: "userManagement",
      },
      {
        icon: "history",
        label: "Activity Logs",
        navigateTo: "Activity Logs",
        accessKey: "activityLogs",
      },
    ],
  },
  {
    label: "AIRCRAFT HEALTH LOGBOOK",
    children: [
      {
        icon: "helicopter",
        label: "Flight Logs",
        navigateTo: "Flight Logs",
        accessKey: "flightLogs",
      },
      {
        icon: "tools",
        label: "Maintenance Logs",
        navigateTo: "Maintenance Logs",
        accessKey: "maintenanceLogs",
      },
      {
        icon: "clipboard-check-outline",
        label: "Pre-Flight Inspection",
        navigateTo: "Pre-Flight Inspection",
        accessKey: "preInspection",
      },
      {
        icon: "clipboard-check-outline",
        label: "Post-Flight Inspection",
        navigateTo: "Post-Flight Inspection",
        accessKey: "postInspection",
      },
    ],
  },
  {
    label: "TASK ASSIGNMENT & MONITORING",
    children: [
      {
        icon: "calendar-clock",
        label: "Tasks",
        navigateTo: "Tasks",
        accessKey: "tasks",
      },
      {
        icon: "account-group",
        label: "Mechanics",
        navigateTo: "Mechanics",
        accessKey: "mechanics",
      },
    ],
  },
  {
    label: "PARTS LIFESPAN & MAINTENANCE TRACKING",
    children: [
      {
        icon: "view-dashboard-outline",
        label: "Parts Lifespan Monitoring",
        navigateTo: "Parts Lifespan Monitoring",
        accessKey: "partsLifespan",
      },
      {
        icon: "radar",
        label: "Maintenance Tracking",
        navigateTo: "Maintenance Tracking",
        accessKey: "maintenanceTracking",
      },
      {
        icon: "flag-outline",
        label: "Maintenance Priority Sorting",
        navigateTo: "Maintenance Priority Sorting",
        accessKey: "maintenancePriority",
      },
    ],
  },
  {
    label: "PARTS REQUISITION",
    children: [
      {
        icon: "inbox-outline",
        label: "Parts Requisition Monitoring",
        navigateTo: "Parts Requisition",
        accessKey: "partsRequisition",
      },
    ],
  },
  {
    label: "SETTINGS",
    children: [
      {
        icon: "account-circle",
        label: "Profile",
        navigateTo: "Profile",
        accessKey: "profile",
      },
    ],
  },
];

function DrawerContent({ navigation }) {
  const nav = useNavigation();
  const { user, logoutUser } = useContext(AuthContext);
  const { scale } = useFontScale();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const userJob = resolveUserRole(user);

  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

  const isVisible = (item) => {
    return hasNavAccess(userJob, item.accessKey);
  };

  const getChildren = (item) =>
    item.children ? item.children.filter(isVisible) : [];
  const visibleDrawerItems = DrawerList.filter((item) => {
    if (item.children) {
      return getChildren(item).length > 0;
    }
    return isVisible(item);
  });

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
          {visibleDrawerItems.map((item) => {
            const isActive =
              (!item.children && item.navigateTo === activeRoute) ||
              (item.children &&
                item.children.some((c) => c.navigateTo === activeRoute));

            if (item.children) {
              return (
                <View key={item.label} style={{ marginTop: 8 }}>
                  <AppText
                    style={{
                      fontSize: scale(10),
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: "#777",
                      marginLeft: 18,
                      marginBottom: 2,
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </AppText>
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
                          <AppText
                            style={{
                              color: childActive ? "#26866F" : "#777",
                              fontSize: scale(12),
                              fontWeight: childActive ? "600" : "400",
                            }}
                            numberOfLines={2}
                          >
                            {child.label}
                          </AppText>
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
                    <AppText
                      style={{
                        color: isActive ? "#26866F" : "#777",
                        fontSize: scale(12),
                        fontWeight: isActive ? "600" : "400",
                      }}
                      numberOfLines={2}
                    >
                      {item.label}
                    </AppText>
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
