import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import Checkbox from "expo-checkbox";

export default function Login() {
  const navigation = useNavigation();
  const [isChecked, setChecked] = useState(false);
  const toggleCheckbox = () => {
    setChecked(!isChecked);
  };

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  return (
    <View style={styles.formCard}>
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Login</Text>
        <Text style={styles.subHeaderText}>Please enter your credentials</Text>
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Username"
          placeholderTextColor={"gray"}
        />
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
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
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
