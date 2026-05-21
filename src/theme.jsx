import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from "react";

export const LIGHT = {
  bg: "#F8F8F6", surface: "#FFFFFF", surfaceAlt: "#F2F2F0", border: "#E8E8E4",
  red: "#CC2936", redLight: "rgba(204,41,54,0.08)", redBorder: "rgba(204,41,54,0.18)",
  black: "#0A0A0A", text: "#1A1A1A", muted: "#6B6B6B", subtle: "#CFCFCF",
  green: "#1A7A4A", orange: "#D4580A", purple: "#6B35C8", blue: "#1E5FCC",
  navBg: "rgba(255,255,255,0.92)",
};

export const DARK = {
  bg: "#0C0C0C", surface: "#161616", surfaceAlt: "#1E1E1E", border: "#2A2A2A",
  red: "#E8384A", redLight: "rgba(232,56,74,0.12)", redBorder: "rgba(232,56,74,0.25)",
  black: "#F5F5F5", text: "#E8E8E8", muted: "#8A8A8A", subtle: "#3A3A3A",
  green: "#22C55E", orange: "#F97316", purple: "#A855F7", blue: "#3B82F6",
  navBg: "rgba(12,12,12,0.95)",
};

// ── CSS VARIABLE APPLICATION ───────────────────────────────────────────────
// Applique TOUS les tokens de couleur comme variables CSS sur :root.
// Les variables CSS se répercutent INSTANTANÉMENT sur tout élément qui les référence
// via var(--c-xxx), sans attendre un re-render React.
function applyCSSVars(dark) {
  const t = dark ? DARK : LIGHT;
  const r = document.documentElement;
  // Couleurs de base
  r.style.setProperty("--c-bg", t.bg);
  r.style.setProperty("--c-surface", t.surface);
  r.style.setProperty("--c-surfaceAlt", t.surfaceAlt);
  r.style.setProperty("--c-border", t.border);
  r.style.setProperty("--c-red", t.red);
  r.style.setProperty("--c-redLight", t.redLight);
  r.style.setProperty("--c-redBorder", t.redBorder);
  r.style.setProperty("--c-black", t.black);
  r.style.setProperty("--c-text", t.text);
  r.style.setProperty("--c-muted", t.muted);
  r.style.setProperty("--c-subtle", t.subtle);
  r.style.setProperty("--c-green", t.green);
  r.style.setProperty("--c-orange", t.orange);
  r.style.setProperty("--c-purple", t.purple);
  r.style.setProperty("--c-blue", t.blue);
  r.style.setProperty("--c-navBg", t.navBg);
  // Variantes alpha (remplacent les patterns ${C.red}44 etc. dans les styles)
  const red = t.red, green = t.green, blue = t.blue, orange = t.orange;
  r.style.setProperty("--c-red-0c",    red + "0c");
  r.style.setProperty("--c-red-10",    red + "10");
  r.style.setProperty("--c-red-12",    red + "12");
  r.style.setProperty("--c-red-15",    red + "15");
  r.style.setProperty("--c-red-22",    red + "22");
  r.style.setProperty("--c-red-44",    red + "44");
  r.style.setProperty("--c-green-10",  green + "10");
  r.style.setProperty("--c-green-12",  green + "12");
  r.style.setProperty("--c-green-15",  green + "15");
  r.style.setProperty("--c-green-18",  green + "18");
  r.style.setProperty("--c-green-22",  green + "22");
  r.style.setProperty("--c-green-44",  green + "44");
  r.style.setProperty("--c-blue-10",   blue + "10");
  r.style.setProperty("--c-blue-22",   blue + "22");
  r.style.setProperty("--c-orange-10", orange + "10");
  // Nettoie l'ancienne classe body.dark si elle traîne d'une version précédente
  document.body.classList.remove("dark");
}

// Initialisation synchrone au chargement du module (avant tout render React)
// → évite le flash de thème sur la première frame
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("themeMode") || "auto";
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initDark = saved === "dark" || (saved === "auto" && sysDark);
    applyCSSVars(initDark);
  } catch { /* SSR / env sans window */ }
}

// ── OBJET C À BASE DE VARIABLES CSS ───────────────────────────────────────
// useC() retourne cet objet. Tous les styles inline qui utilisent C.bg etc.
// deviennent des références CSS var() → se mettent à jour sans re-render.
const CV = {
  bg:        "var(--c-bg)",
  surface:   "var(--c-surface)",
  surfaceAlt:"var(--c-surfaceAlt)",
  border:    "var(--c-border)",
  red:       "var(--c-red)",
  redLight:  "var(--c-redLight)",
  redBorder: "var(--c-redBorder)",
  black:     "var(--c-black)",
  text:      "var(--c-text)",
  muted:     "var(--c-muted)",
  subtle:    "var(--c-subtle)",
  green:     "var(--c-green)",
  orange:    "var(--c-orange)",
  purple:    "var(--c-purple)",
  blue:      "var(--c-blue)",
  navBg:     "var(--c-navBg)",
  // Variantes alpha — remplacent ${C.red}44, ${C.green}22, etc.
  red0c:     "var(--c-red-0c)",
  red10:     "var(--c-red-10)",
  red12:     "var(--c-red-12)",
  red15:     "var(--c-red-15)",
  red22:     "var(--c-red-22)",
  red44:     "var(--c-red-44)",
  green10:   "var(--c-green-10)",
  green12:   "var(--c-green-12)",
  green15:   "var(--c-green-15)",
  green18:   "var(--c-green-18)",
  green22:   "var(--c-green-22)",
  green44:   "var(--c-green-44)",
  blue10:    "var(--c-blue-10)",
  blue22:    "var(--c-blue-22)",
  orange10:  "var(--c-orange-10)",
};

export const ThemeContext = createContext({
  darkMode: false,
  themeMode: "auto",
  setThemeMode: () => {},
  C: CV,
});

export const useTheme = () => useContext(ThemeContext);
// useC() retourne CV (variables CSS) — le composant devient consommateur du contexte
// → re-render garanti sur changement de thème ET les var() se résolvent instantanément
export const useC = () => {
  useContext(ThemeContext); // abonnement au contexte pour déclencher le re-render
  return CV;
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem("themeMode");
    if (saved === "light" || saved === "dark" || saved === "auto") return saved;
    // Migration depuis l'ancien système booléen
    const oldDark = localStorage.getItem("darkMode");
    if (oldDark === "true") return "dark";
    if (oldDark === "false") return "light";
    return "auto";
  });

  const [systemDark, setSystemDark] = useState(() => {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
    catch { return false; }
  });

  // Écoute les changements du thème système
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = e => setSystemDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } catch { /* pas de support matchMedia */ }
  }, []);

  const darkMode = themeMode === "dark" || (themeMode === "auto" && systemDark);

  // useLayoutEffect : s'exécute AVANT que le navigateur peigne → zéro flash
  useLayoutEffect(() => {
    applyCSSVars(darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { darkMode, themeMode, setThemeMode, C: CV } },
    children
  );
}
