"use client";

import { useSyncExternalStore } from "react";
import styles from "./theme-toggle.module.css";

const storageKey = "clube-do-ovo-theme";
const themeChange = "clube-do-ovo-theme-change";

function isDark() {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(onChange: () => void) {
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  function syncPreference(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    const theme = event.newValue;
    if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    onChange();
  }
  systemTheme.addEventListener("change", onChange);
  window.addEventListener(themeChange, onChange);
  window.addEventListener("storage", syncPreference);
  return () => {
    systemTheme.removeEventListener("change", onChange);
    window.removeEventListener(themeChange, onChange);
    window.removeEventListener("storage", syncPreference);
  };
}

function BookThemeIcon({ theme }: { theme: "light" | "dark" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      data-theme-icon={theme} className={theme === "light" ? styles.sun : styles.moon}>
      <path d="M23 20H7.75a2.5 2.5 0 0 0 0 5H23M23 20V4.5c0-.83-.67-1.5-1.5-1.5H8.75a3.5 3.5 0 0 0-3.5 3.5v16M8.5 3v17M9.75 22.5H22" />
      {theme === "light" ? (
        <path d="M18 11.6a2.45 2.45 0 1 1-4.9 0 2.45 2.45 0 0 1 4.9 0Zm-2.45-4.95v.8m0 8.3v.8m4.95-4.95h-.8m-8.3 0h-.8m8.45-3.5-.56.56m-5.86 5.86-.56.56m6.98 0-.56-.56m-5.86-5.86-.56-.56" />
      ) : (
        <path d="M19.25 13.4a4.25 4.25 0 1 1-4.9-5.95 4.37 4.37 0 0 0 4.9 5.95Z" />
      )}
    </svg>
  );
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const theme = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // The choice still applies to the current page if storage is unavailable.
    }
    window.dispatchEvent(new Event(themeChange));
  }

  return (
    <button type="button" role="switch" aria-label="Tema escuro" aria-checked={dark}
      title={dark ? "Ativar tema claro" : "Ativar tema escuro"} className={styles.toggle} onClick={toggle}>
      <BookThemeIcon theme="light" />
      <BookThemeIcon theme="dark" />
    </button>
  );
}
