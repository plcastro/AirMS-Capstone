import { View, Text, Image } from "react-native";
import React, { useState, useContext } from "react";
import { styles } from "../stylesheets/styles";

import Button from "../components/Button";

import { AuthContext } from "../Context/AuthContext";
import UpdateProfile from "../components/UpdateProfile";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const { firstName, lastName, email, username, role } = user;
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileContent}>
        <Text style={styles.headerText}>User Profile</Text>
        <Image
          source={{
            uri: user.image,
          }}
          style={{
            width: 150,
            height: 150,
            marginVertical: 10,
            borderRadius: 100, // half of width/height for circle
          }}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <View style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <Text>Name:</Text>
            <Text>Email: </Text>
            <Text>Username: </Text>
            <Text>Role:</Text>
          </View>
          <View style={{ flexDirection: "column", alignItems: "flex-end" }}>
            <Text>
              {firstName} {lastName}
            </Text>
            <Text>{email}</Text>

            <Text>{username}</Text>

            <Text>{role}</Text>
          </View>
        </View>
        <Button
          label="Update profile"
          onPress={() => setShowUpdateModal(true)}
          buttonStyle={{
            marginTop: 20,
            padding: 10,
            backgroundColor: "#26866F",
            borderRadius: 5,
          }}
          buttonTextStyle={{ color: "#fff", textAlign: "center" }}
        />

        <UpdateProfile
          visible={showUpdateModal}
          user={user}
          onClose={() => setShowUpdateModal(false)}
          onSubmit={(data) => {
            // call API here
            console.log(data);
            setShowUpdateModal(false);
          }}
        />
      </View>
    </View>
  );
}
