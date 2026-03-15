import { useState, useCallback } from "react";

export default function useStoredToggle(key, a, b) {
  const [value, setValue] = useState(() => localStorage.getItem(key) || a);
  const toggle = useCallback(() => {
    setValue((v) => {
      const next = v === a ? b : a;
      localStorage.setItem(key, next);
      return next;
    });
  }, [key, a, b]);
  return [value, toggle];
}
