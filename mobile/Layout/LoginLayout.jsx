import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function LoginLayout({ children, cardTitle, cardsubTitle }) {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={require("../assets/mobile_hero.png")}
          style={styles.topImage}
          resizeMode="cover"
        />

        <View style={styles.overlay}>
          <Image
            source={require("../assets/airmslogo_dark.png")}
            style={styles.logo}
          />

          <Text style={styles.title}>
            Aircraft Maintenance Made{" "}
            <Text style={styles.highlight}>Smarter</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{cardTitle}</Text>
          <Text style={styles.cardSubTitle}>{cardsubTitle}</Text>
        </View>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  imageContainer: {
    position: "relative",
  },

  topImage: {
    width: "100%",
    height: 300,
  },

  overlay: {
    position: "absolute",
    top: "25%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 250,
    height: 120,
    marginBottom: -25,
  },

  title: {
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  highlight: {
    color: "#0ef3ae",
    fontWeight: "bold",
  },
  card: {
    flex: 1,
    paddingTop: 40,
    padding: 20,
    marginTop: -30,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },

  cardSubTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
});
