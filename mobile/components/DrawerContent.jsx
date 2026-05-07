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
    label: "Aircraft Health Logbook",
    jobTitle: ["pilot", "maintenance manager", "officer-in-charge", "mechanic"],
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
    icon: "message-text-outline",
    label: "Messages",
    navigateTo: "Messages",
    jobTitle: ["pilot", "maintenance manager", "mechanic", "officer-in-charge"],
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

            return (
              <View key={item.label}>
                {/* PARENT ITEM */}
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

                {/* CHILD ITEMS */}
                {item.children &&
                  getChildren(item).map((child) => {
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
                          marginLeft: 10,
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
