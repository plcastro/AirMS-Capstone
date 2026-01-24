import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import Checkbox from "expo-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const nav = useNavigation();
  const [getMessage, setMessage] = useState("");
  const [isChecked, setChecked] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const changeHandler = (key, value) => {
    const formattedValue = value;
    setFormData({ ...formData, [key]: formattedValue });
  };
  const validate = () => {
    const { username, password } = formData;
    //validate logic
    if (!username && password) {
      return setMessage("Please enter your username");
    }
    if (username && !password) {
      return setMessage("Please enter your password");
    }
    if (!username && !password) {
      return setMessage("Please enter your username and password");
    }
    login();
  };
  const login = () => {
    //login logic
    nav.replace("dashboard");
  };

  return (
    <SafeAreaView style={styles.formCard}>
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
        <Text style={styles.error}>{getMessage}</Text>
        <View style={styles.loginHelper}>
          <View style={styles.checkBox}>
            <Checkbox
              value={isChecked}
              onValueChange={(val) => {
                setChecked(val);
                console.log("Checkbox checked?", val);
              }}
            />

            <Text>Remember me</Text>
          </View>
          <View style={styles.forgotPassLink}>
            <TouchableOpacity onPress={() => nav.navigate("forgotPassword")}>
              <Text>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { marginTop: 20 }]}
          onPress={() => validate()}
        >
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
