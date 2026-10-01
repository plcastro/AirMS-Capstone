import { useEffect, useState } from "react";

// A small string preference (such as a status filter) that survives leaving the
// page and coming back. Falls back to the default if storage is unavailable.
export default function usePersistedValue(key, initial) {
  const storageKey = `airms:pref:${key}`;
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* Preferences are best effort. */
    }
  }, [storageKey, value]);
  return [value, setValue];
}
