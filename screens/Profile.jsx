import { View, Text, Image, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { styles } from "../stylesheets/styles";
import AlertComp from "../components/AlertComp";

export default function Profile() {
  const [alertVisible, setAlertVisible] = useState(false);

  const handleUpdate = () => {
    console.log("Profile updated!");
  };

  return (
    <>
      <View style={styles.profileCard}>
        <Text style={styles.headerText}>User Profile</Text>
        <Image
          source={{
            uri: "https://static.vecteezy.com/system/resources/previews/022/036/297/non_2x/doraemon-cartoon-japanese-free-vector.jpg",
          }}
          style={{ width: 100, height: 100, marginVertical: 10 }}
        />

        <Text style={styles.subHeaderText}>Full Name: Doraemon</Text>
        <Text style={styles.subHeaderText}>Email: doraemon@gmail.com</Text>
        <Text style={styles.subHeaderText}>Username: doraemon</Text>

        <TouchableOpacity
          onPress={() => setAlertVisible(true)}
          style={{
            marginTop: 20,
            padding: 10,
            backgroundColor: "#26866F",
            borderRadius: 5,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>
            Update Profile
          </Text>
        </TouchableOpacity>

        <AlertComp
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          title="Profile Update"
          message="Are you sure you want to update this profile?"
          onConfirm={handleUpdate}
        />
      </View>
    </>
  );
}
