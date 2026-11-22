"use client";

import { useSyncExternalStore } from "react";
import { Book, Moon, Sun } from "lucide-react";
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
      <span className={styles.book} aria-hidden="true">
        <Book size={27} strokeWidth={1.55} />
        <Sun size={12} strokeWidth={2} data-theme-icon="light" className={styles.sun} />
        <Moon size={11} strokeWidth={2} data-theme-icon="dark" className={styles.moon} />
      </span>
    </button>
  );
}
