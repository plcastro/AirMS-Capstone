export const trustedDeviceManager = {
  register() {
    return true;
  },

  isRegistered() {
    return false;
  },

  revoke() {
    return true;
  },

  migrateLegacyLocalStorage() {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem("trustedDeviceToken");
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("trustedDeviceToken:")) {
        localStorage.removeItem(key);
      }
    }
  },
};
