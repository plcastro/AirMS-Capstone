import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// A small string preference (such as a status filter) that survives leaving the
// screen and coming back. Falls back to the default if storage is unavailable.
export default function usePersistedValue(key, initial) {
  const storageKey = `airms:pref:${key}`;
  const [value, setValue] = useState(initial);
  const touched = useRef(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        // A choice made before the saved value loaded wins.
        if (!cancelled && !touched.current && stored !== null) setValue(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storageKey]);
  const update = useCallback(
    (next) => {
      touched.current = true;
      setValue((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        AsyncStorage.setItem(storageKey, resolved).catch(() => {});
        return resolved;
      });
    },
    [storageKey],
  );
  return [value, update];
}
