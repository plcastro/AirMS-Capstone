import React, { useRef } from "react";
import AppText from "../components/common/AppText";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginLayout({ children, cardTitle, cardsubTitle }) {
  const { width, height } = useWindowDimensions();
  const isSmall = width < 390;
  const heroHeight = Math.max(220, Math.min(340, Math.round(height * 0.38)));

  const scrollY = useRef(new Animated.Value(0)).current;

  const parallaxTranslate = scrollY.interpolate({
    inputRange: [0, heroHeight],
    outputRange: [0, heroHeight * 0.3],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HERO (NOT SCROLLABLE) */}
      <View style={[styles.imageContainer, { height: heroHeight }]}>
        <Animated.Image
          source={require("../assets/mobile_hero.png")}
          style={[
            styles.topImage,
            {
              transform: [{ translateY: parallaxTranslate }],
            },
          ]}
          resizeMode="cover"
        />

        <View style={styles.overlay}>
          <Image
            source={require("../assets/airmslogo_dark.png")}
            style={[styles.logo, { width: isSmall ? 180 : 230 }]}
          />

          <AppText style={[styles.title, { fontSize: isSmall ? 16 : 18 }]}>
            Aircraft Maintenance Made{" "}
            <AppText style={styles.highlight}>Smarter</AppText>
          </AppText>
        </View>
      </View>

      {/* ONLY CARD IS SCROLLABLE */}
      <Animated.ScrollView
        style={styles.cardScroll}
        contentContainerStyle={[
          styles.card,
          { paddingHorizontal: isSmall ? 16 : 25 },
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        bounces={false}
      >
        <View style={styles.cardHeader}>
          <AppText style={[styles.cardTitle, { fontSize: isSmall ? 20 : 24 }]}>
            {cardTitle}
          </AppText>
          <AppText style={styles.cardSubTitle}>{cardsubTitle}</AppText>
        </View>

        {children}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff00",
  },

  imageContainer: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000",
  },

  topImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  logo: {
    width: 230,
    height: 100,
  },

  title: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  highlight: {
    color: "#0ef3ae",
  },

  cardScroll: {
    flex: 1,
    marginTop: -50,
  },

  card: {
    paddingTop: 30,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
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
    textAlign: "center",
  },
});
