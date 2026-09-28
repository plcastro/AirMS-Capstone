let currentSessionProfile = null;

export const setCurrentSessionProfile = (user = null) => {
  currentSessionProfile = user ? { ...user } : null;
};

export const getCurrentSessionProfile = () =>
  currentSessionProfile ? { ...currentSessionProfile } : null;

export const clearCurrentSessionProfile = () => {
  currentSessionProfile = null;
};
