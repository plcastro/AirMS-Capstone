import { View, Text, Image, TouchableOpacity } from "react-native-web";

import React, { useContext } from "react";
import { AuthContext } from "../Context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function DashboardHeader({ pageName }) {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const firstName = user?.firstName || "User";
  const lastName = user?.lastName || "";
  const accessLevel = user?.access || "";
  console.log(user.role, user.access);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: 7,
        paddingRight: 50,
        borderBottomColor: "#b4b4b4",
        borderBottomWidth: 1,
        backgroundColor: "#fff",
      }}
    >
      <View
        style={{
          justifyContent: "flex-end",
          padding: 7,
          paddingRight: 50,
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => navigation.navigate("Profile", { userId: user._id })}
        >
          {/* Profile Image */}
          <Image
            source={{
              uri: "https://static.vecteezy.com/system/resources/previews/022/036/297/non_2x/doraemon-cartoon-japanese-free-vector.jpg",
            }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginRight: 10, // space between image and texts
            }}
          />

          {/* Name & Role */}
          <View style={{ flexDirection: "column" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              {`${firstName} ${lastName}`.trim() || "User"}
            </Text>
            {accessLevel ? (
              <Text style={{ fontSize: 12, color: "#777" }}>{accessLevel}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
