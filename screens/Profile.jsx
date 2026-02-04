import { View, Text, Image, TouchableOpacity, Modal } from "react-native";
import React, { useState, useContext } from "react";
import { styles } from "../stylesheets/styles";

import Button from "../components/Button";
import AlertComp from "../components/AlertComp";
import { AuthContext } from "../Context/AuthContext";
import Dashboard from "../Layout/Dashboard";

export default function Profile() {
  const [alertVisible, setAlertVisible] = useState(false);
  const { user } = useContext(AuthContext);
  const { firstName, lastName, email, username, password } = user;
  console.log("User in Profile:", user);
  const handleUpdate = () => {
    console.log("Profile updated!");
  };

  return (
    <Dashboard>
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
            borderRadius: 150,
          }}
        />

        <Text style={styles.subHeaderText}>
          Full Name: {firstName} {lastName}
        </Text>
        <Text style={styles.subHeaderText}>Email: {email}</Text>
        <Text style={styles.subHeaderText}>Username: {username}</Text>

        <Button
          label="Update Profile"
          onPress={() => setAlertVisible(true)}
          buttonStyle={{
            marginTop: 20,
            padding: 10,
            backgroundColor: "#26866F",
            borderRadius: 5,
          }}
          buttonTextStyle={{ color: "#fff", textAlign: "center" }}
        />
        <Modal
          visible={alertVisible}
          transparent={true}
          animationType="none"
        ></Modal>
        {/* <AlertComp
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          title="Profile Update"
          message="Are you sure you want to update this profile?"
          onConfirm={handleUpdate}
        /> */}
      </View>
    </Dashboard>
  );
}
