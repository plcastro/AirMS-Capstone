import { useEffect, useState } from "react";

// A boolean preference (such as a filter checkbox) that survives leaving the
// page and coming back. Falls back to the default if storage is unavailable.
export default function usePersistedFlag(key, initial = false) {
  const storageKey = `airms:pref:${key}`;
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value ? "1" : "0");
    } catch {
      /* Preferences are best effort. */
    }
  }, [storageKey, value]);
  return [value, setValue];
}
