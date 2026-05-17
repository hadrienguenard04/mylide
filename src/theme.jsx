import React, { createContext, useContext, useState, useEffect } from "react";

export const LIGHT = {
  bg: "#f2f2f2", surface: "#ffffff", surfaceAlt: "#ebebeb", border: "#e0e0e0",
  red: "#CC2936", redLight: "rgba(204,41,54,0.08)", redBorder: "rgba(204,41,54,0.2)",
  black: "#111111", text: "#1a1a1a", muted: "#888888", subtle: "#cccccc",
  green: "#16a34a", orange: "#ea580c", purple: "#7c3aed", blue: "#2563eb",
};

export const DARK = {
  bg: "#0f0f0f", surface: "#1c1c1e", surfaceAlt: "#2c2c2e", border: "#3a3a3c",
  red: "#ff3b4e", redLight: "rgba(255,59,78,0.15)", redBorder: "rgba(255,59,78,0.3)",
  black: "#ffffff", text: "#f2f2f7", muted: "#8e8e93", subtle: "#48484a",
  green: "#30d158", orange: "#ff9f0a", purple: "#bf5af2", blue: "#0a84ff",
};

export const ThemeContext = createContext({ C: LIGHT, darkMode: false, setDarkMode: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const C = darkMode ? DARK : LIGHT;

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.body.style.background = C.bg;
  }, [darkMode, C.bg]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { C, darkMode, setDarkMode } },
    children
  );
}