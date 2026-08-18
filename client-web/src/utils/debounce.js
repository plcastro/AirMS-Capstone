import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const debounce = (callback, delay = 300) => {
  let timeoutId;

  const debounced = (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };

  debounced.cancel = () => window.clearTimeout(timeoutId);

  return debounced;
};

export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
};

export const useDebouncedCallback = (callback, delay = 300) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useMemo(
    () =>
      debounce((...args) => {
        callbackRef.current?.(...args);
      }, delay),
    [delay],
  );

  useEffect(() => () => debounced.cancel(), [debounced]);

  return useCallback((...args) => debounced(...args), [debounced]);
};
