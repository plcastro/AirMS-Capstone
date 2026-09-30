const STORAGE_PREFIX = "airms:";

const STORAGE_BUCKETS = {
  auth: "auth",
  client: "client",
};

const STORAGE_KEYS = {
  aircraftFhDueNotifications: {
    bucket: "client",
    key: "aircraftFhDueNotifications",
  },

  aircraftFhDueWarningSeen: {
    bucket: "client",
    key: "aircraftFhDueWarningSeen",
  },

  authActivity: {
    bucket: "auth",
    key: "authActivity",
  },

  authSyncEvent: {
    bucket: "auth",
    key: "authSyncEvent",
  },

  maintenanceLogSeenIds: {
    bucket: "client",
    key: "maintenanceLogSeenIds",
  },

  rememberMe: {
    bucket: "auth",
    key: "rememberMe",
  },

  rememberedIdentifier: {
    bucket: "auth",
    key: "rememberedIdentifier",
  },
};

const SENSITIVE_KEY_PATTERN =
  /token|password|pin|credential|authorization|bearer|trustedDevice/i;

const assertAllowedKey = (key) => {
  const definition = STORAGE_KEYS[key];

  if (!definition) {
    throw new Error(`Unsupported AirMS storage key: ${key}`);
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    throw new Error(`Sensitive values must not use airmStorage: ${key}`);
  }

  return definition;
};

const bucketStorageKey = (bucket) =>
  `${STORAGE_PREFIX}${STORAGE_BUCKETS[bucket]}`;

const parseStoredValue = (value, fallback = null) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const readBucket = (bucket) => {
  const key = bucketStorageKey(bucket);

  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeBucket = (bucket, data) => {
  const key = bucketStorageKey(bucket);

  localStorage.setItem(key, JSON.stringify(data));
};

export const airmStorage = {
  get(key, fallback = null) {
    const definition = assertAllowedKey(key);

    const bucket = readBucket(definition.bucket);

    if (Object.prototype.hasOwnProperty.call(bucket, definition.key)) {
      return bucket[definition.key];
    }

    /*
     * Backward compatibility:
     *
     * First check the old centralized key:
     * airms:rememberMe
     *
     * Then check the original legacy key:
     * rememberMe
     *
     * This allows existing users to migrate without
     * breaking their current data.
     */
    const oldAirmsKey = `${STORAGE_PREFIX}${definition.key}`;

    const oldAirmsValue = localStorage.getItem(oldAirmsKey);

    if (oldAirmsValue !== null) {
      return parseStoredValue(oldAirmsValue, fallback);
    }

    const legacyValue = localStorage.getItem(definition.key);

    if (legacyValue !== null) {
      return parseStoredValue(legacyValue, fallback);
    }

    return fallback;
  },

  set(key, value) {
    const definition = assertAllowedKey(key);

    const bucket = readBucket(definition.bucket);

    bucket[definition.key] = value;

    writeBucket(definition.bucket, bucket);

    /*
     * Remove the old versions after successful migration.
     */
    localStorage.removeItem(`${STORAGE_PREFIX}${definition.key}`);

    localStorage.removeItem(definition.key);
  },

  remove(key) {
    const definition = assertAllowedKey(key);

    const bucket = readBucket(definition.bucket);

    if (Object.prototype.hasOwnProperty.call(bucket, definition.key)) {
      delete bucket[definition.key];

      if (Object.keys(bucket).length > 0) {
        writeBucket(definition.bucket, bucket);
      } else {
        localStorage.removeItem(bucketStorageKey(definition.bucket));
      }
    }

    /*
     * Also remove old storage formats.
     */
    localStorage.removeItem(`${STORAGE_PREFIX}${definition.key}`);

    localStorage.removeItem(definition.key);
  },

  rawKey(key) {
    const definition = assertAllowedKey(key);

    /*
     * This is mainly for compatibility.
     *
     * Since multiple logical values now share one
     * physical bucket, rawKey() returns the bucket.
     */
    return bucketStorageKey(definition.bucket);
  },
};

export const removeLegacyClientReadableCredentials = () => {
  [
    "token",
    "access_token",
    "accessToken",
    "refresh_token",
    "refreshToken",
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);

    if (key?.startsWith("trustedDeviceToken")) {
      localStorage.removeItem(key);
    }
  }
};
