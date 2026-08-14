import {
  View,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import AppText from "../components/common/AppText";
import React from "react";
import LoginLayout from "../Layout/LoginLayout";
import { COLORS } from "../stylesheets/colors";

export default function LoadingScreen({
  message = "Loading...",
  showLogo = true,
}) {
  return (
    <LoginLayout cardTitle="Please wait" cardsubTitle={message}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#244D3B" />
        <AppText style={styles.text}>
          {showLogo
            ? "We are preparing your session."
            : "Loading your request."}
        </AppText>
      </View>
    </LoginLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    minHeight: 120,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
  },
  text: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.grayDark,
    textAlign: "center",
  },
});
