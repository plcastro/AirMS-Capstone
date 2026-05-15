import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStoreModule = null;
try {
  // Optional at runtime: prevents hard crash when native module is missing in a stale build.
  // eslint-disable-next-line global-require
  SecureStoreModule = require("expo-secure-store");
} catch (error) {
  SecureStoreModule = null;
}

export const secureGetItem = async (key) => {
  if (SecureStoreModule?.getItemAsync) {
    try {
      const value = await SecureStoreModule.getItemAsync(key);
      if (value !== null && value !== undefined) return value;
    } catch {}
  }
  return AsyncStorage.getItem(key);
};

export const secureSetItem = async (key, value) => {
  if (SecureStoreModule?.setItemAsync) {
    try {
      await SecureStoreModule.setItemAsync(key, value);
    } catch {}
  }
  await AsyncStorage.setItem(key, value);
};

export const secureDeleteItem = async (key) => {
  if (SecureStoreModule?.deleteItemAsync) {
    try {
      await SecureStoreModule.deleteItemAsync(key);
    } catch {}
  }
  await AsyncStorage.removeItem(key);
};
