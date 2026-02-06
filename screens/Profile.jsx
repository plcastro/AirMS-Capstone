import { View, Text, Image } from "react-native";
import React, { useState, useContext } from "react";
import { styles } from "../stylesheets/styles";

import Button from "../components/Button";

import { AuthContext } from "../Context/AuthContext";
import PasswordUpdateProfile from "../components/PasswordUpdateProfile";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const { firstName, lastName, email, username } = user;
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <View style={styles.profileCard}>
      <Text style={styles.headerText}>User Profile</Text>
      <Image
        source={{
          uri: "https://static.vecteezy.com/system/resources/previews/022/036/297/non_2x/doraemon-cartoon-japanese-free-vector.jpg",
        }}
        style={{
          width: 200,
          height: 200,
          marginVertical: 10,
          borderRadius: 100, // half of width/height for circle
        }}
      />

      <Text style={styles.subHeaderText}>
        Full Name: {firstName} {lastName}
      </Text>
      <Text style={styles.subHeaderText}>Email: {email}</Text>
      <Text style={styles.subHeaderText}>Username: {username}</Text>

      <Button
        label="Update my password"
        onPress={() => setShowPasswordModal(true)}
        buttonStyle={{
          marginTop: 20,
          padding: 10,
          backgroundColor: "#26866F",
          borderRadius: 5,
        }}
        buttonTextStyle={{ color: "#fff", textAlign: "center" }}
      />
      <PasswordUpdateProfile
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={(data) => {
          // call API here
          console.log(data);
          setShowPasswordModal(false);
        }}
      />
    </View>
  );
}
