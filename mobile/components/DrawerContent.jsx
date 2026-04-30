import React, { useState, useContext } from "react";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { View, Image } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../stylesheets/styles";
import AirMSWeb from "../assets/AirMS_web.png";

import AlertComp from "./AlertComp";

import { AuthContext } from "../Context/AuthContext";

const DrawerList = [
  {
    icon: "clipboard-search",
    label: "Aircraft Health Logbook",
    jobTitle: [
      "pilot",
      "maintenance manager",
      "officer-in-charge",
      "mechanic",
    ],
    children: [
      {
        icon: "book-open-page-variant",
        label: "Flight Logbook",
        navigateTo: "Flight Logbook",
        jobTitle: [
          "pilot",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
      {
        icon: "book-open-page-variant",
        label: "Pre-Inspection",
        navigateTo: "Pre-Inspection",
        jobTitle: [
          "pilot",
          "maintenance manager",
          "officer-in-charge",
          "mechanic",
        ],
      },
      {
        icon: "book-open-page-variant",
        label: "Post-Inspection",
        navigateTo: "Post-Inspection",
        jobTitle: ["maintenance manager", "officer-in-charge", "mechanic"],
      },
    ],
  },
  {
    icon: "clipboard-text",
    label: "Task Assignment and Monitoring",
    jobTitle: ["maintenance manager", "mechanic"],
    children: [
      {
        icon: "clipboard-text",
        label: "Tasks",
        navigateTo: "Tasks",
        jobTitle: ["maintenance manager", "mechanic"],
      },
      {
        icon: "account-group",
        label: "Mechanic List",
        navigateTo: "Mechanics",
        jobTitle: ["maintenance manager"],
      },
    ],
  },
  {
    icon: "file-document-outline",
    label: "Parts Requisition",
    navigateTo: "Parts Requisition",
    jobTitle: ["maintenance manager", "mechanic", "officer-in-charge"],
  },
  {
    icon: "account-circle",
    label: "My Profile",
    navigateTo: "Profile",
    jobTitle: ["pilot", "maintenance manager", "mechanic", "officer-in-charge"],
  },
];

function DrawerContent({ navigation }) {
  const nav = useNavigation();
  const { user, logoutUser } = useContext(AuthContext);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const userjobTitle = user?.jobTitle?.toLowerCase();
  const activeRoute =
    navigation.getState().routes[navigation.getState().index].name;

  const handleLogout = async () => {
    try {
      await logoutUser({ notifyServer: true });
      nav.replace("login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const isItemVisible = (item) => {
    const jobTitles = item.jobTitle?.map((p) => p.toLowerCase()) || [];
    return jobTitles.length === 0 || jobTitles.includes(userjobTitle);
  };

  const getChildren = (item) => {
    if (!item.children) return [];
    return item.children.filter(isItemVisible);
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
                    <MaterialCommunityIcons
                      name={item.icon}
                      color={isActive ? "#fff" : "#777"}
                      size={size}
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

                {item.children &&
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
            <MaterialCommunityIcons
              name="exit-to-app"
              color={color}
              size={size}
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
