const STORAGE_PREFIX = "airms:";

const STORAGE_KEYS = {
  aircraftFhDueNotifications: "aircraftFhDueNotifications",
  aircraftFhDueWarningSeen: "aircraftFhDueWarningSeen",
  authActivity: "authActivity",
  authSyncEvent: "authSyncEvent",
  maintenanceLogSeenIds: "maintenanceLogSeenIds",
  rememberMe: "rememberMe",
  rememberedBase: "rememberedBase",
  rememberedIdentifier: "rememberedIdentifier",
};

const SENSITIVE_KEY_PATTERN =
  /token|password|pin|credential|authorization|bearer|trustedDevice/i;

const assertAllowedKey = (key) => {
  if (!Object.prototype.hasOwnProperty.call(STORAGE_KEYS, key)) {
    throw new Error(`Unsupported AirMS storage key: ${key}`);
  }
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    throw new Error(`Sensitive values must not use airmStorage: ${key}`);
  }
};

const storageKey = (key) => `${STORAGE_PREFIX}${STORAGE_KEYS[key]}`;

const parseStoredValue = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const airmStorage = {
  get(key, fallback = null) {
    assertAllowedKey(key);
    const legacyKey = STORAGE_KEYS[key];
    const value = localStorage.getItem(storageKey(key));
    if (value !== null) return parseStoredValue(value, fallback);
    return parseStoredValue(localStorage.getItem(legacyKey), fallback);
  },

  set(key, value) {
    assertAllowedKey(key);
    localStorage.setItem(storageKey(key), JSON.stringify(value));
    localStorage.removeItem(STORAGE_KEYS[key]);
  },

  remove(key) {
    assertAllowedKey(key);
    localStorage.removeItem(storageKey(key));
    localStorage.removeItem(STORAGE_KEYS[key]);
  },

  rawKey(key) {
    assertAllowedKey(key);
    return storageKey(key);
  },
};

export const removeLegacyClientReadableCredentials = () => {
  ["token", "access_token", "accessToken", "refresh_token", "refreshToken"].forEach(
    (key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
  );

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("trustedDeviceToken")) {
      localStorage.removeItem(key);
    }
  }
};
