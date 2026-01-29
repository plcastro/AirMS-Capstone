import React from "react";
import { CommonActions } from "@react-navigation/native";
import { View, StyleSheet, Text, TouchableOpacity, Image } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { Avatar } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AirMSWeb from "../assets/AirMS_web.png";
import { styles } from "../stylesheets/styles";
import { SafeAreaView } from "react-native-safe-area-context";
const DrawerList = [
  { icon: "home-outline", label: "Home", navigateTo: "Dashboard" },

  {
    icon: "account",
    label: "Parts Monitoring",
    navigateTo: "Parts Monitoring",
  },
  //user management - admin only
  { icon: "account-group", label: "User Management", navigateTo: "" },
  { icon: "book", label: "Aircraft Log Book", navigateTo: "Logbook" },
  { icon: "book", label: "Component Inventory", navigateTo: "" },
  { icon: "sort", label: "Priority Sorting", navigateTo: "" },
  {
    icon: "chart-arc",
    label: "Report and Analytics",
    navigateTo: "",
  },
  { icon: "account", label: "Profile", navigateTo: "Profile" },
];

function DrawerContent(props) {
  const { navigation } = props;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        {/* Top Logo */}
        <Image
          source={AirMSWeb}
          style={{
            width: 150,
            height: 50,
            alignSelf: "center",
            marginVertical: 10,
          }}
        />

        {/* Drawer Items */}
        <View style={styles.drawerSection}>
          {DrawerList.map((item, index) => (
            <DrawerItem
              key={index}
              icon={({ color, size }) => (
                <Icon name={item.icon} color={color} size={size} />
              )}
              label={item.label}
              onPress={() => {
                if (item.navigateTo) {
                  // Use CommonActions to prevent auto-closing
                  navigation.dispatch(
                    CommonActions.navigate({
                      name: item.navigateTo,
                    }),
                  );
                }
              }}
            />
          ))}
        </View>
      </DrawerContentScrollView>

      {/* Bottom Logout */}
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
