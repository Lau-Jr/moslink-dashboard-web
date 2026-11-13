import { useCallback, useEffect, useState } from "react";
import { readStorage, writeStorage } from "./storage";

export type Theme = "dark" | "light";
const KEY = "moslink-theme"; // same key as the old Flask dashboard

function initialTheme(): Theme {
  const saved = readStorage(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      writeStorage(KEY, next);
      return next;
    });
  }, []);
  return [theme, toggle];
}
