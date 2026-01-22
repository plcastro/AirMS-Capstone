import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import Checkbox from "expo-checkbox";

export default function Login() {
  const navigation = useNavigation();
  const [isChecked, setChecked] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const changeHandler = (key, value) => {
    const formattedValue = value;
    setFormData({ ...formData, [key]: formattedValue });
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Login</Text>
        <Text style={[styles.subHeaderText, { marginBottom: 20 }]}>
          Please enter your credentials
        </Text>
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Username"
          placeholderTextColor={"gray"}
          value={formData.username}
          onChangeText={(e) => changeHandler("username", e)}
        />
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
          value={formData.password}
          onChangeText={(e) => changeHandler("password", e)}
        />
        <View style={styles.loginHelper}>
          <View style={styles.checkBox}>
            <Checkbox value={isChecked} onValueChange={setChecked} />
            <Text>Remember me</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("forgotPassword")}
          >
            <Text>Forgot password?</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.button, { marginTop: 20 }]}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
