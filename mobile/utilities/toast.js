const toastListeners = new Set();
const pendingToasts = [];
const RECENT_TOAST_MS = 1800;
let recentToast = null;

// A toast shown while a native modal is changing (a form hidden while it saves,
// then shown again) would otherwise only reach the app-level host, which sits
// behind any open modal. Newly mounted hosts replay a toast that is still fresh.
export const getRecentToast = () =>
  recentToast && Date.now() - recentToast.at < RECENT_TOAST_MS
    ? recentToast.message
    : null;

export const subscribeToToast = (listener) => {
  if (typeof listener !== "function") return () => {};

  toastListeners.add(listener);

  if (pendingToasts.length > 0) {
    const queuedToasts = pendingToasts.splice(0);
    queuedToasts.forEach(listener);
  }

  return () => {
    toastListeners.delete(listener);
  };
};

export const showToast = (message) => {
  if (!message) return;

  const normalizedMessage = String(message);
  recentToast = { message: normalizedMessage, at: Date.now() };

  if (toastListeners.size === 0) {
    pendingToasts.push(normalizedMessage);
    return;
  }

  toastListeners.forEach((listener) => listener(normalizedMessage));
};
