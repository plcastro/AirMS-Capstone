import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { Avatar } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AirMSWeb from "../assets/AirMS_web.png";
import { styles } from "../stylesheets/styles";

const DrawerList = [
  { icon: "home-outline", label: "Home", navigateTo: "dashboard" },

  { icon: "account", label: "Parts Monitoring", navigateTo: "profile" },
  //user management - admin only
  { icon: "account-group", label: "User Management", navigateTo: "" },
  { icon: "book", label: "Aircraft Log Book", navigateTo: "" },
  { icon: "book", label: "Component Inventory", navigateTo: "" },
  { icon: "sort", label: "Priority Sorting", navigateTo: "" },
  {
    icon: "chart-arc",
    label: "Report and Analytics",
    navigateTo: "",
  },
  { icon: "account", label: "Profile", navigateTo: "profile" },
];

function DrawerContent(props) {
  const { navigation } = props;

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        {/* Top Logo */}
        <Image
          source={AirMSWeb}
          style={{
            width: 200,
            height: 60,
            alignSelf: "center",
            marginVertical: 10,
          }}
        />

        {/* User info */}
        <TouchableOpacity>
          <View style={styles.userInfoSection}>
            <View style={{ flexDirection: "row", marginTop: 15 }}>
              <Avatar.Image
                // source={{
                //   uri: "data:image/png;base64,...", // keep your base64
                // }}
                size={50}
                style={{ marginTop: 5 }}
              />
              <View style={{ marginLeft: 10, justifyContent: "center" }}>
                <Text style={styles.title}>Fullname</Text>
                <Text style={styles.caption} numberOfLines={1}>
                  Email
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

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
                if (
                  item.label.toLowerCase() === "sign out" ||
                  item.label.toLowerCase() === "log out"
                ) {
                  navigation.replace("login");
                } else if (item.navigateTo) {
                  navigation.navigate(item.navigateTo);
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
    </View>
  );
}

export default DrawerContent;
