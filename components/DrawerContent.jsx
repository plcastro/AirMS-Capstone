import React, { useState, useEffect } from "react";
import { CommonActions, useRoute } from "@react-navigation/native";
import { View, Image } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../stylesheets/styles";
import AirMSWeb from "../assets/AirMS_web.png";

const DrawerList = [
  {
    icon: "account-group",
    label: "User Management",
    navigateTo: "UserManagement",
    children: [
      { label: "Manage Users", navigateTo: "UserManagement" },
      { label: "Audit Trail", navigateTo: "Audit Trail" },
    ],
  },

  { icon: "book", label: "Aircraft Logbook", navigateTo: "Logbook" },

  {
    icon: "account",
    label: "Parts Monitoring",
    children: [
      { label: "Parts Monitoring Table", navigateTo: "Parts Monitoring" },
      { label: "Track Maintenance", navigateTo: "Track Maintenance" },
    ],
  },

  { icon: "book", label: "Component Inventory", navigateTo: "" },
  { icon: "sort", label: "Priority Sorting", navigateTo: "" },
  { icon: "chart-arc", label: "Report and Analytics", navigateTo: "" },
  { icon: "account", label: "Profile", navigateTo: "Profile" },
];

function DrawerContent({ navigation }) {
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
          {DrawerList.map((item, index) => {
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
          label="Sign Out"
          onPress={() => navigation.replace("login")}
        />
      </View>
    </SafeAreaView>
  );
}

export default DrawerContent;
