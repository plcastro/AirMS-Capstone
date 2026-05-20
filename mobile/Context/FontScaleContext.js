import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MOBILE_SETTINGS_KEY = "mobileProfileSettings";
const DEFAULT_FONT_SCALE = 1;

const FontScaleContext = createContext({
  fontScalePreference: DEFAULT_FONT_SCALE,
  setFontScalePreference: async () => {},
  scale: (size) => size,
});

export function FontScaleProvider({ children }) {
  const [fontScalePreference, setFontScalePreferenceState] =
    useState(DEFAULT_FONT_SCALE);

  useEffect(() => {
    const loadFontScale = async () => {
      try {
        const stored = JSON.parse(
          (await AsyncStorage.getItem(MOBILE_SETTINGS_KEY)) || "{}",
        );
        const storedFont = stored.fontSizePreference;
        if (typeof storedFont === "number") {
          setFontScalePreferenceState(storedFont);
          return;
        }
        const legacyMap = { small: 0.9, medium: 1, large: 1.1 };
        setFontScalePreferenceState(legacyMap[storedFont] || DEFAULT_FONT_SCALE);
      } catch {
        setFontScalePreferenceState(DEFAULT_FONT_SCALE);
      }
    };

    loadFontScale();
  }, []);

  const setFontScalePreference = async (nextValue, options = {}) => {
    const { persist = true } = options;
    const numericValue = Number(nextValue) || DEFAULT_FONT_SCALE;
    setFontScalePreferenceState(numericValue);
    if (!persist) return;

    try {
      const stored = JSON.parse(
        (await AsyncStorage.getItem(MOBILE_SETTINGS_KEY)) || "{}",
      );
      const payload = {
        ...stored,
        fontSizePreference: numericValue,
      };
      await AsyncStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(payload));
    } catch {}
  };

  const value = useMemo(() => {
    const scale = (size) =>
      Number((Number(size || 0) * Number(fontScalePreference || 1)).toFixed(2));
    return {
      fontScalePreference,
      setFontScalePreference,
      scale,
    };
  }, [fontScalePreference]);

  return (
    <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>
  );
}

export function useFontScale() {
  return useContext(FontScaleContext);
}
