export const AIRCRAFT_FH_WARNING_SEEN_KEY = "aircraftFhDueWarningSeen";
export const AIRCRAFT_FH_NOTIFICATIONS_KEY = "aircraftFhDueNotifications";
export const AIRCRAFT_FH_NOTIFICATIONS_EVENT =
  "aircraft-fh-notifications-updated";

const DAY_MS = 24 * 60 * 60 * 1000;

export const AIRCRAFT_FH_STORAGE_POLICY = {
  notificationRetentionDays: 45,
  notificationMaxItems: 100,
  warningSeenRetentionDays: 14,
  warningSeenMaxItems: 300,
};

export const getUserScopedStorageKey = (baseKey, userId) =>
  userId ? `${baseKey}:${userId}` : baseKey;

const safeParseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const readJsonArray = (key) => {
  if (typeof localStorage === "undefined") return [];
  const parsed = safeParseJson(localStorage.getItem(key), []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeJsonIfChanged = (key, value) => {
  if (typeof localStorage === "undefined") return false;
  const nextSerialized = JSON.stringify(value);
  if (localStorage.getItem(key) === nextSerialized) return false;
  localStorage.setItem(key, nextSerialized);
  return true;
};

const removeStorageKey = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Best effort cleanup.
  }
};

const getTimeValue = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getNotificationStorageId = (notification = {}) => {
  if (notification._id) return String(notification._id);

  const metadata = notification.metadata || {};
  return [
    "aircraft-fh",
    String(notification.createdAt || "").slice(0, 10),
    metadata.aircraft || notification.entityId || "",
    metadata.inspectionKey || metadata.inspectionName || notification.title || "",
    metadata.threshold ?? "",
  ].join("|");
};

export const loadAircraftFhNotifications = (userId) =>
  cleanupAircraftFhNotifications(
    readJsonArray(
      getUserScopedStorageKey(AIRCRAFT_FH_NOTIFICATIONS_KEY, userId),
    ),
    userId,
  );

export const cleanupAircraftFhNotifications = (
  notifications = [],
  userId,
  policy = AIRCRAFT_FH_STORAGE_POLICY,
) => {
  const cutoff = Date.now() - policy.notificationRetentionDays * DAY_MS;
  const byId = new Map();

  notifications.forEach((notification) => {
    if (!notification || typeof notification !== "object") return;
    const id = getNotificationStorageId(notification);
    const createdAt = notification.createdAt || new Date().toISOString();
    if (getTimeValue(createdAt) < cutoff) return;

    const existing = byId.get(id);
    byId.set(id, {
      ...existing,
      ...notification,
      _id: id,
      createdAt,
      read: existing?.read === true ? true : Boolean(notification.read),
    });
  });

  const sorted = Array.from(byId.values()).sort(
    (left, right) =>
      getTimeValue(right.createdAt) - getTimeValue(left.createdAt),
  );
  const unread = sorted.filter((item) => !item.read);
  const read = sorted.filter((item) => item.read);
  const availableReadSlots = Math.max(
    0,
    policy.notificationMaxItems - unread.length,
  );
  const bounded = [...unread, ...read.slice(0, availableReadSlots)].sort(
    (left, right) =>
      getTimeValue(right.createdAt) - getTimeValue(left.createdAt),
  );

  writeJsonIfChanged(
    getUserScopedStorageKey(AIRCRAFT_FH_NOTIFICATIONS_KEY, userId),
    bounded,
  );
  return bounded;
};

export const saveAircraftFhNotifications = (notifications, userId) => {
  const stored = cleanupAircraftFhNotifications(notifications, userId);
  window.dispatchEvent(new Event(AIRCRAFT_FH_NOTIFICATIONS_EVENT));
  return stored;
};

export const upsertAircraftFhNotification = (notification, userId) => {
  const current = loadAircraftFhNotifications(userId);
  const nextId = getNotificationStorageId(notification);
  const existing = current.find((item) => item._id === nextId);
  const nextNotification = {
    ...existing,
    ...notification,
    _id: nextId,
    read: existing?.read === true ? true : Boolean(notification.read),
    createdAt:
      existing?.createdAt || notification.createdAt || new Date().toISOString(),
    ...(notification.updatedAt ? { updatedAt: notification.updatedAt } : {}),
  };
  const next = existing
    ? current.map((item) => (item._id === nextId ? nextNotification : item))
    : [nextNotification, ...current];

  return saveAircraftFhNotifications(next, userId);
};

const getWarningKeyDate = (key) => {
  const [datePart] = String(key).split("|");
  const parsed = new Date(`${datePart}T00:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
};

export const loadAircraftFhWarningSeenKeys = (userId) => {
  const key = getUserScopedStorageKey(AIRCRAFT_FH_WARNING_SEEN_KEY, userId);
  const cutoff =
    Date.now() - AIRCRAFT_FH_STORAGE_POLICY.warningSeenRetentionDays * DAY_MS;
  const unique = Array.from(
    new Set(readJsonArray(key).map(String).filter(Boolean)),
  )
    .filter((item) => getWarningKeyDate(item) >= cutoff)
    .sort((left, right) => getWarningKeyDate(right) - getWarningKeyDate(left))
    .slice(0, AIRCRAFT_FH_STORAGE_POLICY.warningSeenMaxItems);

  writeJsonIfChanged(key, unique);
  return new Set(unique);
};

export const saveAircraftFhWarningSeenKeys = (keys, userId) => {
  const key = getUserScopedStorageKey(AIRCRAFT_FH_WARNING_SEEN_KEY, userId);
  const cutoff =
    Date.now() - AIRCRAFT_FH_STORAGE_POLICY.warningSeenRetentionDays * DAY_MS;
  const bounded = Array.from(new Set(Array.from(keys || []).map(String)))
    .filter(Boolean)
    .filter((item) => getWarningKeyDate(item) >= cutoff)
    .sort((left, right) => getWarningKeyDate(right) - getWarningKeyDate(left))
    .slice(0, AIRCRAFT_FH_STORAGE_POLICY.warningSeenMaxItems);

  writeJsonIfChanged(key, bounded);
  return new Set(bounded);
};

export const cleanupUserScopedTemporaryStorage = (userId) => {
  if (!userId || typeof localStorage === "undefined") return;
  cleanupAircraftFhNotifications(loadAircraftFhNotifications(userId), userId);
  saveAircraftFhWarningSeenKeys(loadAircraftFhWarningSeenKeys(userId), userId);
};

export const removeLegacyAircraftFhBaseKeys = () => {
  removeStorageKey(AIRCRAFT_FH_NOTIFICATIONS_KEY);
  removeStorageKey(AIRCRAFT_FH_WARNING_SEEN_KEY);
};

export const removeUserScopedAircraftFhStorage = (userId) => {
  if (!userId) return;
  removeStorageKey(
    getUserScopedStorageKey(AIRCRAFT_FH_NOTIFICATIONS_KEY, userId),
  );
  removeStorageKey(
    getUserScopedStorageKey(AIRCRAFT_FH_WARNING_SEEN_KEY, userId),
  );
};
