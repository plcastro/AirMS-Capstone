import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// A boolean preference (such as a filter toggle) that survives leaving the
// screen and coming back. Falls back to the default if storage is unavailable.
export default function usePersistedFlag(key, initial = false) {
  const storageKey = `airms:pref:${key}`;
  const [value, setValue] = useState(initial);
  const touched = useRef(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        // A tap that happened before the saved value loaded wins.
        if (!cancelled && !touched.current && stored !== null) {
          setValue(stored === "1");
        }
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
        AsyncStorage.setItem(storageKey, resolved ? "1" : "0").catch(() => {});
        return resolved;
      });
    },
    [storageKey],
  );
  return [value, update];
}
