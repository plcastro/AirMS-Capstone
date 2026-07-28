import React, { useRef } from "react";
import AppText from "../components/common/AppText";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginLayout({ children, cardTitle, cardsubTitle }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmall = width < 390;
  const isShort = height < 680;
  const sheetMaxHeight = Math.min(
    Math.max(390, Math.round(height * 0.72)),
    height - 144,
  );
  const logoWidth = isSmall || isShort ? 168 : 220;
  const logoHeight = isSmall || isShort ? 76 : 96;

  const scrollY = useRef(new Animated.Value(0)).current;

  const parallaxTranslate = scrollY.interpolate({
    inputRange: [0, sheetMaxHeight],
    outputRange: [0, -Math.round(height * 0.04)],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={[styles.safeArea, { minHeight: height }]}>
      <Animated.Image
        source={require("../assets/mobile_hero.png")}
        style={[
          styles.backgroundImage,
          {
            height,
            transform: [{ translateY: parallaxTranslate }],
          },
        ]}
        resizeMode="contain"
      />
      <View style={styles.scrim} />

      <View
        pointerEvents="none"
        style={[
          styles.brandLayer,
          {
            paddingTop: Math.max(insets.top + 20, 34),
            bottom: sheetMaxHeight,
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

      <Animated.ScrollView
        style={[styles.sheet, { maxHeight: sheetMaxHeight }]}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingHorizontal: isSmall ? 16 : 25 },
          { paddingBottom: Math.max(insets.bottom + 28, 44) },
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
        <View style={styles.sheetHandle} />
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
  },

  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.26)",
  },

  brandLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
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
  },

  sheetContent: {
    paddingTop: 12,
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
