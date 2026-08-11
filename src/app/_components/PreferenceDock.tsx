"use client";

import { useEffect, useState } from "react";
import { message, type Locale } from "../_lib/i18n.ts";
import { THEME_STORAGE_KEY } from "../_lib/application.ts";
import { SelectControl } from "./ui/Select.tsx";

type Theme = "light" | "dark";

const LANGUAGE_OPTIONS = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
] as const;

/** Global display preferences stay available without consuming payroll space. */
export function PreferenceDock({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const t = (key: Parameters<typeof message>[1]) => message(locale, key);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initial: Theme = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  }

  const themeLabel = theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme");

  return (
    <aside
      data-testid="preference-dock"
      className="preference-dock"
      aria-label={t("displayPreferences")}
    >
      <div data-testid="parameter-locale" className="preference-item">
        <label htmlFor="field-language" className="sr-only">
          {t("language")}
        </label>
        <SelectControl
          id="field-language"
          aria-label={t("language")}
          name="lang"
          nativeLabel={t("language")}
          value={locale}
          onValueChange={(value) => onLocaleChange(value as Locale)}
          className="preference-control preference-language"
          options={LANGUAGE_OPTIONS}
          hideChevron
          contentWidth="options"
          renderValue={
            <span className="language-trigger-value" aria-hidden="true">
              <span className="language-globe" />
              <span className="language-code">{locale.toUpperCase()}</span>
            </span>
          }
        />
      </div>

      <button
        id="field-theme"
        type="button"
        className="preference-control preference-theme"
        aria-label={themeLabel}
        title={themeLabel}
        data-theme={theme ?? "system"}
        onClick={toggleTheme}
      >
        <span className="theme-symbol" aria-hidden="true">
          {theme === "dark" ? "☾" : "☀"}
        </span>
      </button>
    </aside>
  );
}
