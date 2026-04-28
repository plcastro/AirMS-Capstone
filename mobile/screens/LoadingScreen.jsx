import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import React from "react";

export default function LoadingScreen({
  message = "Loading...",
  showLogo = true,
}) {
  return (
    <View style={styles.overlay}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.card}>
        {showLogo ? (
          <Image
            source={require("../assets/AirMS_web.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : null}
        <ActivityIndicator size="large" color="#244D3B" />
        <Text style={styles.title}>Please wait</Text>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F5FBF7",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    paddingHorizontal: 22,
  },
  glowTop: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(38, 134, 111, 0.18)",
    top: -60,
    left: -60,
  },
  glowBottom: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(36, 77, 59, 0.14)",
    bottom: -70,
    right: -70,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(36,77,59,0.2)",
    shadowColor: "#1B3A2B",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  title: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#173628",
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    color: "#406252",
    textAlign: "center",
    lineHeight: 20,
  },
});
