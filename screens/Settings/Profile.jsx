import { View, Text, Image } from "react-native";
import React, { useState, useContext } from "react";
import { styles } from "../../stylesheets/styles";

import Button from "../../components/Button";

import { AuthContext } from "../../Context/AuthContext";
import UpdateProfile from "../../components/UpdateProfile";
import { API_BASE } from "../../utilities/API_BASE";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const { firstName, lastName, email, username, position, image } = user;
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  console.log(image);
  const profileImage =
    image && typeof image === "string"
      ? image.startsWith("http")
        ? image
        : `${API_BASE}${image}`
      : `${API_BASE}/uploads/default_avatar.jpg`;

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.profileContent}>
          <Text style={styles.headerText}>User Profile</Text>
          <Image
            source={{
              uri: profileImage,
            }}
            style={{
              width: 150,
              height: 150,
              marginVertical: 10,
              borderRadius: 100,
            }}
          />

          <View style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <Text>
              <Text style={{ fontWeight: "bold" }}>Name:</Text> {firstName}{" "}
              {lastName}
            </Text>
            <Text>
              <Text style={{ fontWeight: "bold" }}>Email:</Text> {email}
            </Text>
            <Text>
              <Text style={{ fontWeight: "bold" }}>Username:</Text> {username}
            </Text>
            <Text>
              <Text style={{ fontWeight: "bold" }}>Position:</Text> {position}
            </Text>
          </View>
          <Button
            label="Edit profile"
            onPress={() => setShowUpdateModal(true)}
            buttonStyle={[
              styles.primaryAlertBtn,
              { width: 150, marginTop: 20 },
            ]}
            buttonTextStyle={styles.primaryBtnTxt}
          />

          <UpdateProfile
            visible={showUpdateModal}
            user={user}
            onClose={() => setShowUpdateModal(false)}
            onSubmit={(data) => {
              console.log(data);
              setShowUpdateModal(false);
            }}
          />
        </View>
      </View>
    </View>
  );
}
