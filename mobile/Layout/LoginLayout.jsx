import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginLayout({ children, cardTitle, cardsubTitle }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: "100%",
    height: 320,
    position: "relative",
    backgroundColor: "#000",
  },
  topImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 40, // Keeps content above the curved card overlap
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 230, // Larger horizontal footprint
    height: 100, // Explicit height to force it larger
  },
  title: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  highlight: {
    color: "#0ef3ae",
  },
  card: {
    flex: 1,
    marginTop: -30,
    paddingTop: 30,
    paddingHorizontal: 25,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  cardSubTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
});
