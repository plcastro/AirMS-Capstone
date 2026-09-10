import React, { useRef } from "react";
import AppText from "../components/common/AppText";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_IMAGE = require("../assets/mobile_hero.png");
const HERO_IMAGE_SIZE = Image.resolveAssetSource(HERO_IMAGE);

export default function LoginLayout({ children, cardTitle, cardsubTitle }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmall = width < 390;
  const isShort = height < 680;
  const sheetHeight = Math.min(
    Math.max(420, Math.round(height * 0.78)),
    height - 104,
  );
  const heroImageHeight = Math.round(
    width * (HERO_IMAGE_SIZE.height / HERO_IMAGE_SIZE.width),
  );
  const logoWidth = isSmall || isShort ? 168 : 220;
  const logoHeight = isSmall || isShort ? 76 : 96;

  const scrollY = useRef(new Animated.Value(0)).current;

  const parallaxTranslate = scrollY.interpolate({
    inputRange: [0, sheetHeight],
    outputRange: [0, -Math.round(height * 0.04)],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.safeArea, { height }]}>
      <Animated.Image
        source={HERO_IMAGE}
        style={[
          styles.backgroundImage,
          {
            height: heroImageHeight,
            transform: [{ translateY: parallaxTranslate }],
          },
        ]}
        resizeMode="cover"
      />
      <View style={styles.scrim} />

      <View
        pointerEvents="none"
        style={[
          styles.brandLayer,
          {
            paddingTop: Math.max(insets.top + 20, 34),
            bottom: sheetHeight,
          },
        ]}
      >
        <Image
          source={require("../assets/airmslogo_dark.png")}
          style={[styles.logo, { width: logoWidth, height: logoHeight }]}
          resizeMode="contain"
        />

        <AppText style={[styles.title, { fontSize: isSmall ? 16 : 18 }]}>
          Aircraft Maintenance Made{" "}
          <AppText style={styles.highlight}>Smarter</AppText>
        </AppText>
      </View>

      <View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.sheetHandle} />
        <Animated.ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingHorizontal: isSmall ? 16 : 25 },
            { paddingBottom: Math.max(insets.bottom + 8, 16) },
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardHeader}>
            <AppText style={[styles.cardTitle, { fontSize: isSmall ? 20 : 24 }]}>
              {cardTitle}
            </AppText>
            <AppText style={styles.cardSubTitle}>{cardsubTitle}</AppText>
          </View>

          {children}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#071611",
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  backgroundImage: {
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#071611",
    zIndex: 0,
  },

  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.26)",
    zIndex: 1,
  },

  brandLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 2,
  },

  logo: {
    height: 96,
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

  sheet: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 3,
  },

  sheetContent: {
    paddingTop: 0,
  },

  sheetScroll: {
    flex: 1,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#d7ddd9",
    marginBottom: 18,
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
